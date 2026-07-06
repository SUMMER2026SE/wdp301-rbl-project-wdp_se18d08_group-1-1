const mongoose = require('mongoose');
const User = require('../models/User');
const UserDetail = require('../models/UserDetail');
const Vehicle = require('../models/Vehicle');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const UserNotification = require('../models/UserNotification');
const Notification = require('../models/Notification');
const Slot = require('../models/Slot');
const SlotMaintenanceLog = require('../models/SlotMaintenanceLog');
const ParkingFloor = require('../models/ParkingFloor');
const ParkingLot = require('../models/ParkingLot');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);
const toBooleanStatus = (status) => status === true || status === 'true' || status === 'active';
const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};
const startOfMonth = (date = new Date()) => {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
};

const formatDurationParts = (milliseconds) => {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const buildSlotKey = (floorId, slotNumber) => `${String(floorId || '')}:${String(slotNumber || '').trim().toUpperCase()}`;

const collectLayoutSlots = (elements = [], floor) => {
  const slots = [];

  for (const element of elements || []) {
    if (!element) continue;
    if (String(element.type || '').startsWith('slot') && element.name) {
      slots.push({
        _id: `layout_${floor._id}_${element.id || element.name}`,
        slotNumber: element.name,
        status: 'available',
        floorID: {
          _id: floor._id,
          name: floor.name,
          floorNumber: floor.floorNumber,
          parkingLotID: floor.parkingLotID || null,
        },
        zoneID: null,
        reservedFor: null,
        updatedAt: floor.updatedAt,
        fromLayout: true,
      });
    }

    if (Array.isArray(element.children) && element.children.length) {
      slots.push(...collectLayoutSlots(element.children, floor));
    }
  }

  return slots;
};

const averageDurationMs = (items, startField, endField, fallbackEnd = new Date()) => {
  const durations = items
    .map((item) => {
      const start = item[startField] ? new Date(item[startField]).getTime() : null;
      const end = item[endField] ? new Date(item[endField]).getTime() : fallbackEnd.getTime();
      return start && end > start ? end - start : null;
    })
    .filter((duration) => typeof duration === 'number');

  if (!durations.length) return 0;
  return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
};

const sumPaymentAmount = async (match) => {
  const result = await WalletTransaction.aggregate([
    { $match: { type: 'PAYMENT', status: 'COMPLETED', ...match } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
};

const serializeActivity = (type, title, description, createdAt, meta = {}) => ({
  type,
  title,
  description,
  createdAt,
  meta
});

const getRecentActivities = async () => {
  const [users, bookings, entries, exits, payments, notifications] = await Promise.all([
    User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5).select('username email createdAt').lean(),
    Booking.find().sort({ createdAt: -1 }).limit(5).select('licensePlate slotCode status createdAt').lean(),
    Session.find().sort({ checkInTime: -1 }).limit(5).select('licensePlate parkingSlot checkInTime').lean(),
    Session.find({ checkOutTime: { $ne: null } }).sort({ checkOutTime: -1 }).limit(5).select('licensePlate parkingSlot checkOutTime totalPrice').lean(),
    WalletTransaction.find({ type: 'PAYMENT', status: 'COMPLETED' }).sort({ createdAt: -1 }).limit(5).select('amount description createdAt refSource').lean(),
    Notification.find().sort({ createdAt: -1 }).limit(5).select('title type targetType createdAt').lean()
  ]);

  return [
    ...users.map((user) => serializeActivity(
      'customer_registered',
      'Customer registered',
      `${user.username || user.email || 'Customer'} joined VALO Parking`,
      user.createdAt,
      { customerId: user._id }
    )),
    ...bookings.map((booking) => serializeActivity(
      'booking_created',
      'Booking created',
      `${booking.licensePlate || 'Vehicle'} booked slot ${booking.slotCode || 'N/A'}`,
      booking.createdAt,
      { bookingId: booking._id, status: booking.status }
    )),
    ...entries.map((session) => serializeActivity(
      'parking_entry',
      'Parking entry',
      `${session.licensePlate || 'Vehicle'} entered slot ${session.parkingSlot || 'N/A'}`,
      session.checkInTime,
      { sessionId: session._id }
    )),
    ...exits.map((session) => serializeActivity(
      'parking_exit',
      'Parking exit',
      `${session.licensePlate || 'Vehicle'} exited from slot ${session.parkingSlot || 'N/A'}`,
      session.checkOutTime,
      { sessionId: session._id, amount: session.totalPrice || 0 }
    )),
    ...payments.map((payment) => serializeActivity(
      'payment_success',
      'Payment success',
      `${payment.description || 'Wallet payment'} - ${payment.amount || 0} VND`,
      payment.createdAt,
      { transactionId: payment._id, refSource: payment.refSource }
    )),
    ...notifications.map((notification) => serializeActivity(
      'notification_sent',
      'Notification sent',
      `${notification.title || 'Notification'} (${notification.targetType || 'targeted'})`,
      notification.createdAt,
      { notificationId: notification._id, type: notification.type }
    ))
  ]
    .filter((activity) => activity.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
};

const customerPipeline = (match = {}) => [
  { $match: { role: 'customer', ...match } },
  {
    $lookup: {
      from: 'userdetails',
      localField: '_id',
      foreignField: 'userId',
      as: 'profile'
    }
  },
  {
    $unwind: {
      path: '$profile',
      preserveNullAndEmptyArrays: true
    }
  }
];

const getCustomerById = async (id) => {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const users = await User.aggregate([
    ...customerPipeline({ _id: objectId }),
    { $limit: 1 }
  ]);
  return users[0] || null;
};

const getVehiclesForCustomer = (customerId) =>
  Vehicle.find({ owner: customerId }).sort({ isDefault: -1, createdAt: -1 }).lean();

const getWalletForCustomer = async (customerId) => {
  const wallet = await Wallet.findOne({ userId: customerId }).lean();
  const transactions = await WalletTransaction.find({ userId: customerId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    wallet: wallet || null,
    currentBalance: wallet?.balance || 0,
    totalTopup: wallet?.totalTopUp || 0,
    totalPayment: wallet?.totalSpent || 0,
    lastTransaction: transactions[0] || null,
    recentTransactions: transactions
  };
};

const getBookingsForCustomer = async (customerId) => {
  const bookings = await Booking.find({ userId: customerId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    upcomingBookings: await Booking.countDocuments({
      userId: customerId,
      status: { $in: ['confirmed', 'active'] },
      endTime: { $gte: new Date() }
    }),
    completedBookings: await Booking.countDocuments({ userId: customerId, status: 'completed' }),
    cancelledBookings: await Booking.countDocuments({ userId: customerId, status: 'cancelled' }),
    recentBookings: bookings
  };
};

const getParkingSessionsForCustomer = async (customerId) => {
  const current = await Session.findOne({ userId: customerId, status: 'active' })
    .sort({ checkInTime: -1 })
    .lean();
  const recentSessions = await Session.find({ userId: customerId })
    .sort({ checkInTime: -1 })
    .limit(10)
    .lean();

  return {
    currentParkingStatus: current ? 'active' : 'inactive',
    currentSession: current || null,
    recentSessions
  };
};

const getNotificationsForCustomer = async (customerId) => {
  const notifications = await UserNotification.find({ userId: customerId, isDeleted: false })
    .populate('notificationId')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const totalNotifications = await UserNotification.countDocuments({ userId: customerId, isDeleted: false });
  const unreadNotifications = await UserNotification.countDocuments({
    userId: customerId,
    isDeleted: false,
    isRead: false
  });

  return {
    totalNotifications,
    unreadNotifications,
    lastNotification: notifications[0] || null,
    recentNotifications: notifications
  };
};

const buildCustomerDetail = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const [vehicles, wallet, bookings, parkingSessions, notifications] = await Promise.all([
    getVehiclesForCustomer(customerId),
    getWalletForCustomer(customerId),
    getBookingsForCustomer(customerId),
    getParkingSessionsForCustomer(customerId),
    getNotificationsForCustomer(customerId)
  ]);

  return {
    ...customer,
    vehicles,
    vehicle: vehicles[0] || null,
    wallet,
    bookings,
    parkingSessions,
    notifications,
    activity: {
      accountCreated: customer.createdAt,
      profileUpdated: customer.profile?.updatedAt || customer.updatedAt,
      bookingCreated: bookings.recentBookings[0]?.createdAt || null,
      walletTopup: wallet.recentTransactions.find((txn) => txn.type === 'TOP_UP')?.createdAt || null,
      parkingEntry: parkingSessions.recentSessions[0]?.checkInTime || null,
      parkingExit: parkingSessions.recentSessions.find((session) => session.checkOutTime)?.checkOutTime || null
    }
  };
};

const listCustomerData = async () => {
  const users = await User.aggregate([
    ...customerPipeline(),
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: 'owner',
        as: 'vehicles'
      }
    },
    { $sort: { createdAt: -1 } }
  ]);

  return users.map((user) => ({
    ...user,
    vehicle: user.vehicles?.[0] || null
  }));
};

exports.getDashboardOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfDay();
    const monthStart = startOfMonth();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      totalCustomers,
      newCustomersThisMonth,
      todayBookings,
      pendingBookings,
      completedBookings,
      todayRevenue,
      totalRevenueThisMonth,
      notificationsSentToday,
      unreadInternalNotifications,
      openMaintenanceLogs,
      recentBookings,
      recentSessions,
      activeSessions,
      activeSessionsWithSlots,
      yesterdayCompletedSessions,
      slots,
      floors,
      lots,
      activeReservations,
      recentMaintenanceLogs,
      recentActivities
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }),
      Booking.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'active'] } }),
      Booking.countDocuments({ status: 'completed' }),
      sumPaymentAmount({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      sumPaymentAmount({ createdAt: { $gte: monthStart } }),
      Notification.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Notification.countDocuments({
        createdAt: { $gte: todayStart },
        adminDeletedBy: { $not: { $elemMatch: { userId: req.user._id } } },
        adminReadBy: { $not: { $elemMatch: { userId: req.user._id } } }
      }),
      SlotMaintenanceLog.countDocuments({ $or: [{ endTime: { $exists: false } }, { endTime: null }] }),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('licensePlate slotCode status startTime endTime createdAt floorId')
        .populate('floorId', 'name floorNumber parkingLotID')
        .lean(),
      Session.find()
        .sort({ checkInTime: -1 })
        .limit(8)
        .select('licensePlate parkingSlot floorId status checkInTime checkOutTime expectedDurationHours vehicleType')
        .populate('floorId', 'name floorNumber parkingLotID')
        .lean(),
      Session.find({ status: 'active' })
        .select('licensePlate parkingSlot floorId checkInTime expectedDurationHours vehicleType phone userId')
        .populate('userId', 'email username')
        .lean(),
      Session.find({ status: 'active', parkingSlot: { $ne: null }, floorId: { $ne: null } })
        .select('licensePlate parkingSlot floorId checkInTime expectedDurationHours vehicleType phone userId')
        .populate('userId', 'email username')
        .lean(),
      Session.find({
        status: 'completed',
        checkOutTime: { $gte: yesterdayStart, $lt: todayStart },
        checkInTime: { $ne: null }
      })
        .select('checkInTime checkOutTime')
        .lean(),
      Slot.find()
        .populate('floorID', 'name floorNumber parkingLotID')
        .populate('zoneID', 'zoneName zoneType')
        .sort({ floorID: 1, slotNumber: 1 })
        .lean(),
      ParkingFloor.find().sort({ floorNumber: 1 }).lean(),
      ParkingLot.find().sort({ name: 1 }).lean(),
      Booking.find({
        status: { $in: ['confirmed', 'active'] },
        endTime: { $gt: now }
      })
        .select('floorId slotCode licensePlate startTime endTime status')
        .lean(),
      SlotMaintenanceLog.find({ $or: [{ endTime: { $exists: false } }, { endTime: null }] })
        .sort({ startTime: -1 })
        .limit(5)
        .populate('slotID', 'slotNumber floorID')
        .lean(),
      getRecentActivities()
    ]);

    const activeSessionBySlot = new Map();
    activeSessionsWithSlots.forEach((session) => {
      activeSessionBySlot.set(buildSlotKey(session.floorId, session.parkingSlot), session);
    });

    const reservationBySlot = new Map();
    activeReservations.forEach((booking) => {
      reservationBySlot.set(buildSlotKey(booking.floorId, booking.slotCode), booking);
    });

    const dbSlotKeys = new Set(slots.map((slot) => buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber)));
    const layoutSlots = floors
      .flatMap((floor) => collectLayoutSlots(floor.layoutData?.elements || [], floor))
      .filter((slot) => !dbSlotKeys.has(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber)));
    const managedSlots = [...slots, ...layoutSlots].sort((a, b) => {
      const floorCompare = String(a.floorID?.floorNumber || '').localeCompare(String(b.floorID?.floorNumber || ''), undefined, { numeric: true });
      if (floorCompare) return floorCompare;
      return String(a.slotNumber || '').localeCompare(String(b.slotNumber || ''), undefined, { numeric: true });
    });

    const slotSamples = managedSlots.slice(0, 8).map((slot) => {
      const activeSession = activeSessionBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
      const reservation = reservationBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
      const effectiveStatus = slot.status === 'maintenance'
        ? 'maintenance'
        : activeSession || slot.status === 'occupied'
          ? 'occupied'
          : reservation || slot.status === 'booked' || slot.reservedFor
            ? 'reserved'
            : 'available';

      return {
        _id: slot._id,
        slotNumber: slot.slotNumber,
        status: effectiveStatus,
        rawStatus: slot.status,
        floorId: slot.floorID?._id || slot.floorID,
        floorName: slot.floorID?.name || null,
        zoneName: slot.zoneID?.zoneName || null,
        reservedFor: slot.reservedFor || null,
        updatedAt: slot.updatedAt,
        activeSession: activeSession || null,
        activeBooking: reservation || null
      };
    });

    const effectiveCounts = managedSlots.reduce(
      (counts, slot) => {
        const activeSession = activeSessionBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
        const reservation = reservationBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
        const status = slot.status === 'maintenance'
          ? 'maintenance'
          : activeSession || slot.status === 'occupied'
            ? 'occupied'
            : reservation || slot.status === 'booked' || slot.reservedFor
              ? 'reserved'
              : 'available';
        counts[status] += 1;
        return counts;
      },
      { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    );

    const floorSummaries = floors.map((floor) => {
      const floorSlots = managedSlots.filter((slot) => String(slot.floorID?._id || slot.floorID) === String(floor._id));
      const occupied = floorSlots.filter((slot) =>
        activeSessionBySlot.has(buildSlotKey(floor._id, slot.slotNumber)) || slot.status === 'occupied'
      ).length;
      const reserved = floorSlots.filter((slot) =>
        !activeSessionBySlot.has(buildSlotKey(floor._id, slot.slotNumber)) &&
        (reservationBySlot.has(buildSlotKey(floor._id, slot.slotNumber)) || slot.status === 'booked' || slot.reservedFor)
      ).length;
      const maintenance = floorSlots.filter((slot) => slot.status === 'maintenance').length;
      const total = floorSlots.length;
      const occupancyRate = total ? Math.round((occupied / total) * 100) : 0;

      return {
        _id: floor._id,
        name: floor.name,
        floorNumber: floor.floorNumber,
        parkingLotID: floor.parkingLotID || null,
        totalSlots: total,
        occupiedSlots: occupied,
        reservedSlots: reserved,
        availableSlots: Math.max(0, total - occupied - reserved - maintenance),
        maintenanceSlots: maintenance,
        occupancyRate
      };
    });

    const lotSummaries = lots.map((lot) => {
      const lotFloors = floorSummaries.filter((floor) => String(floor.parkingLotID || '') === String(lot._id));
      const totalSlots = lotFloors.reduce((sum, floor) => sum + floor.totalSlots, 0);
      const occupiedSlots = lotFloors.reduce((sum, floor) => sum + floor.occupiedSlots, 0);
      return {
        _id: lot._id,
        name: lot.name,
        address: lot.address,
        status: lot.status,
        totalSlots,
        occupiedSlots,
        occupancyRate: totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
        floorCount: lotFloors.length
      };
    });

    const unassignedFloors = floorSummaries.filter((floor) => !floor.parkingLotID);
    if (!lotSummaries.length && floorSummaries.length) {
      lotSummaries.push({
        _id: 'default',
        name: 'Main Parking Area',
        address: null,
        status: 'active',
        totalSlots: floorSummaries.reduce((sum, floor) => sum + floor.totalSlots, 0),
        occupiedSlots: floorSummaries.reduce((sum, floor) => sum + floor.occupiedSlots, 0),
        occupancyRate: managedSlots.length ? Math.round((effectiveCounts.occupied / managedSlots.length) * 100) : 0,
        floorCount: floorSummaries.length
      });
    } else if (unassignedFloors.length) {
      const totalSlots = unassignedFloors.reduce((sum, floor) => sum + floor.totalSlots, 0);
      const occupiedSlots = unassignedFloors.reduce((sum, floor) => sum + floor.occupiedSlots, 0);
      lotSummaries.push({
        _id: 'unassigned',
        name: 'Unassigned Floors',
        address: null,
        status: 'active',
        totalSlots,
        occupiedSlots,
        occupancyRate: totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
        floorCount: unassignedFloors.length
      });
    }

    const activeParkingSessions = activeSessions.length;
    const vehiclesInside = new Set(activeSessions.map((session) => session.licensePlate).filter(Boolean)).size;
    const totalSlots = managedSlots.length;
    const occupiedSlots = effectiveCounts.occupied;
    const availableSlots = effectiveCounts.available;
    const occupancyRate = totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
    const averageDwellMs = averageDurationMs(activeSessions, 'checkInTime', 'checkOutTime', now);
    const yesterdayAverageDwellMs = averageDurationMs(yesterdayCompletedSessions, 'checkInTime', 'checkOutTime');
    const dwellDeltaMinutes = yesterdayAverageDwellMs
      ? Math.round((averageDwellMs - yesterdayAverageDwellMs) / 60000)
      : null;

    const overdueSessions = activeSessions.filter((session) => {
      if (!session.checkInTime || !session.expectedDurationHours) return false;
      const expectedExit = new Date(session.checkInTime).getTime() + Number(session.expectedDurationHours) * 3600000;
      return expectedExit < now.getTime();
    });

    const nearCapacityAlerts = floorSummaries
      .filter((floor) => floor.totalSlots > 0 && floor.occupancyRate >= 90)
      .map((floor) => ({
        type: 'capacity',
        level: 'warn',
        text: `${floor.name} near capacity (${floor.occupancyRate}%)`,
        time: now,
        meta: { floorId: floor._id, occupancyRate: floor.occupancyRate }
      }));

    const maintenanceAlerts = recentMaintenanceLogs.map((log) => ({
      type: 'maintenance',
      level: 'error',
      text: `Slot ${log.slotID?.slotNumber || 'N/A'} under maintenance: ${log.reason}`,
      time: log.startTime || log.createdAt,
      meta: { slotId: log.slotID?._id, logId: log._id }
    }));

    const overdueAlerts = overdueSessions.slice(0, 5).map((session) => ({
      type: 'overstay',
      level: 'warn',
      text: `${session.licensePlate || 'Vehicle'} exceeded expected parking time at ${session.parkingSlot || 'unassigned slot'}`,
      time: session.checkInTime,
      meta: { sessionId: session._id, slot: session.parkingSlot }
    }));

    const alerts = [...overdueAlerts, ...nearCapacityAlerts, ...maintenanceAlerts]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        newCustomersThisMonth,
        activeParkingSessions,
        vehiclesInside,
        availableSlots,
        occupiedSlots,
        todayBookings,
        pendingBookings,
        completedBookings,
        todayRevenue,
        totalRevenueThisMonth,
        notificationsSentToday,
        unreadInternalNotifications,
        parkingViolations: overdueSessions.length,
        pendingIssues: openMaintenanceLogs + overdueSessions.length,
        recentActivities,
        recentBookings,
        recentSessions,
        slotSamples,
        slots: managedSlots.map((slot) => {
          const activeSession = activeSessionBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
          const reservation = reservationBySlot.get(buildSlotKey(slot.floorID?._id || slot.floorID, slot.slotNumber));
          const effectiveStatus = slot.status === 'maintenance'
            ? 'maintenance'
            : activeSession || slot.status === 'occupied'
              ? 'occupied'
              : reservation || slot.status === 'booked' || slot.reservedFor
                ? 'reserved'
                : 'available';

          return {
            _id: slot._id,
            slotNumber: slot.slotNumber,
            status: effectiveStatus,
            rawStatus: slot.status,
            floorId: slot.floorID?._id || slot.floorID,
            floorName: slot.floorID?.name || null,
            floorNumber: slot.floorID?.floorNumber || null,
            lotId: slot.floorID?.parkingLotID || null,
            zoneName: slot.zoneID?.zoneName || null,
            zoneType: slot.zoneID?.zoneType || null,
            reservedFor: slot.reservedFor || null,
            updatedAt: slot.updatedAt,
            activeSession: activeSession || null,
            activeBooking: reservation || null,
            fromLayout: Boolean(slot.fromLayout)
          };
        }),
        totalSlots,
        reservedSlots: effectiveCounts.reserved,
        maintenanceSlots: effectiveCounts.maintenance,
        occupancyRate,
        averageDwellTime: {
          milliseconds: averageDwellMs,
          label: formatDurationParts(averageDwellMs),
          deltaMinutesVsYesterday: dwellDeltaMinutes
        },
        assignedLots: lotSummaries.length,
        assignedFloors: floorSummaries.length,
        lots: lotSummaries,
        floors: floorSummaries,
        alerts
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  List all customer users with their profiles
 * @route GET /api/staff/users
 * @access Staff only
 */
exports.listCustomers = async (req, res, next) => {
  try {
    const users = await listCustomerData();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

exports.searchCustomers = async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    if (!keyword) {
      const users = await listCustomerData();
      return res.status(200).json({ success: true, data: users });
    }

    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const plateRegex = new RegExp(normalizeLicensePlate(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const vehicleMatches = await Vehicle.find({ licensePlate: plateRegex }).select('owner').lean();
    const vehicleOwnerIds = vehicleMatches.map((vehicle) => vehicle.owner);

    const users = await User.aggregate([
      ...customerPipeline(),
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: 'owner',
          as: 'vehicles'
        }
      },
      {
        $addFields: {
          fullName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$profile.firstName', ''] },
                  ' ',
                  { $ifNull: ['$profile.lastName', ''] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          $or: [
            { username: regex },
            { email: regex },
            { _id: { $in: vehicleOwnerIds } },
            { fullName: regex },
            { 'profile.firstName': regex },
            { 'profile.lastName': regex },
            { 'profile.phone': regex },
            { 'vehicles.licensePlate': plateRegex }
          ]
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: users.map((user) => ({ ...user, vehicle: user.vehicles?.[0] || null }))
    });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerDetail = async (req, res, next) => {
  try {
    const detail = await buildCustomerDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.status(200).json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerVehicles = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await getVehiclesForCustomer(req.params.id) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerWallet = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await getWalletForCustomer(req.params.id) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerBookings = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await getBookingsForCustomer(req.params.id) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerParkingSessions = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await getParkingSessionsForCustomer(req.params.id) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerNotifications = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await getNotificationsForCustomer(req.params.id) });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update customer status (block/unblock)
 * @route PUT /api/staff/users/:id/status
 * @access Staff only
 */
exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Ensure the target is a customer
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    user.status = toBooleanStatus(status);
    await user.save();
    
    const detail = await buildCustomerDetail(user._id);
    res.status(200).json({ success: true, data: detail || user });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update customer details (profile)
 * @route PUT /api/staff/users/:id
 * @access Staff only
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, licensePlate, status } = req.body;
    
    // Check target user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    // Notice we DO NOT allow changing the role here at all, even if passed in req.body.
    // Staff cannot escalate or change roles.
    
    let userDetail = await UserDetail.findOne({ userId: user._id });
    if (!userDetail) {
      userDetail = new UserDetail({ userId: user._id });
    }
    
    if (firstName !== undefined) userDetail.firstName = firstName;
    if (lastName !== undefined) userDetail.lastName = lastName;
    if (phone !== undefined) userDetail.phone = phone;
    await userDetail.save();

    if (status !== undefined) {
      user.status = toBooleanStatus(status);
      await user.save();
    }

    if (licensePlate !== undefined) {
      const vehicle = await Vehicle.findOne({ owner: user._id }).sort({ isDefault: -1, createdAt: -1 });
      if (vehicle) {
        vehicle.licensePlate = normalizeLicensePlate(licensePlate);
        await vehicle.save();
      }
    }

    const updatedUser = await buildCustomerDetail(user._id);
    res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
};
