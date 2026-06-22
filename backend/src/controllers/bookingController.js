const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const ParkingFloor = require('../models/ParkingFloor');
const Service = require('../models/Service');
const Session = require('../models/Session');
const Vehicle = require('../models/Vehicle');
const Slot = require('../models/Slot');
const TicketPackage = require('../models/TicketPackage');
const walletService = require('../services/walletService');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');
const { emitToUser } = require('../sockets/notificationSocket');

const BOOKING_STATUSES_THAT_BLOCK_SLOT = ['confirmed', 'active'];

const normalizeSlotCode = (slotCode = '') => String(slotCode).trim().toUpperCase();

const buildSlotKey = (floorId, slotCode) => `${String(floorId)}:${normalizeSlotCode(slotCode)}`;

const parseBookingTimeRange = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw Object.assign(new Error('Invalid booking time'), { statusCode: 400 });
  }

  if (start >= end) {
    throw Object.assign(new Error('endTime must be after startTime'), { statusCode: 400 });
  }

  return { start, end };
};

const isCarSlotElement = (element) => {
  if (!element?.type || !String(element.type).startsWith('slot')) return false;

  // The current parking map builder still supports moto slots, but Valo Parking is car-only.
  return element.type !== 'slot-moto';
};

const isHourlySlot = (slotElement, zoneElement) => {
  const slotMode = String(slotElement.zoneMode || slotElement.zone || '').toLowerCase();
  const zoneMode = String(zoneElement?.zoneMode || zoneElement?.zone || '').toLowerCase();
  const zoneName = String(zoneElement?.name || '').toLowerCase();

  if ([slotMode, zoneMode].includes('yearly')) return false;
  if (zoneName.includes('yearly') || zoneName.includes('fixed')) return false;

  return true;
};

const getAllBookableSlots = async () => {
  const floors = await ParkingFloor.find().sort({ floorNumber: 1 }).lean();

  return floors.flatMap((floor) => {
    const elements = floor.layoutData?.elements || [];
    const elementById = new Map(elements.map((element) => [element.id, element]));

    return elements
      .filter(isCarSlotElement)
      .filter(slot => slot.name && slot.name.trim() !== '') // Skip empty parking slots (ghost slots)
      .map((slot) => {
        const zone = slot.parentId ? elementById.get(slot.parentId) : null;
        return {
          floorId: floor._id,
          floorName: floor.name,
          floorNumber: floor.floorNumber,
          slotCode: normalizeSlotCode(slot.name), // Name is guaranteed because it was filtered above
          slotType: slot.type,
          zoneName: zone?.name || null,
          elementId: slot.id,
          x: slot.x,
          y: slot.y,
          isHourly: isHourlySlot(slot, zone),
        };
      })
      .filter((slot) => slot.slotCode && slot.isHourly);
  });
};

const getUnavailableSlotKeys = async (start, end, userId = null) => {
  const overlappingBookings = await Booking.find({
    status: { $in: BOOKING_STATUSES_THAT_BLOCK_SLOT },
    startTime: { $lt: end },
    endTime: { $gt: start },
  })
    .select('floorId slotCode')
    .lean();

  const activeSessions = await Session.find({
    status: 'active',
    floorId: { $ne: null },
    parkingSlot: { $ne: null },
  })
    .select('floorId parkingSlot')
    .lean();

  const maintenanceSlots = await Slot.find({ status: 'maintenance' })
    .select('floorID slotNumber')
    .lean();

  // Find slots reserved for other users
  const reservedSlotsQuery = { reservedFor: { $ne: null } };
  if (userId) {
    reservedSlotsQuery.reservedFor = { $ne: userId };
  }
  const reservedSlots = await Slot.find(reservedSlotsQuery)
    .select('floorID slotNumber')
    .lean();

  const unavailable = new Set();

  overlappingBookings.forEach((booking) => {
    unavailable.add(buildSlotKey(booking.floorId, booking.slotCode));
  });

  activeSessions.forEach((session) => {
    unavailable.add(buildSlotKey(session.floorId, session.parkingSlot));
  });

  maintenanceSlots.forEach((slot) => {
    unavailable.add(buildSlotKey(slot.floorID, slot.slotNumber));
  });

  reservedSlots.forEach((slot) => {
    unavailable.add(buildSlotKey(slot.floorID, slot.slotNumber));
  });

  return unavailable;
};

const getAvailableSlotsForRange = async (start, end, userId = null) => {
  const [slots, unavailableSlotKeys] = await Promise.all([
    getAllBookableSlots(),
    getUnavailableSlotKeys(start, end, userId),
  ]);

  return slots.filter((slot) => !unavailableSlotKeys.has(buildSlotKey(slot.floorId, slot.slotCode)));
};

const resolveLicensePlate = async (userId, { vehicleId, licensePlate }) => {
  if (vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: userId }).lean();
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
    }
    return normalizeLicensePlate(vehicle.licensePlate);
  }

  const plate = normalizeLicensePlate(licensePlate);
  if (!plate) {
    throw Object.assign(new Error('licensePlate or vehicleId is required'), { statusCode: 400 });
  }
  return plate;
};

const getSessionExpectedEndTime = (session) => {
  const start = new Date(session.checkInTime);
  if (Number.isNaN(start.getTime())) return null;

  const expectedHours = Math.max(Number(session.expectedDurationHours || 1), 1);
  return new Date(start.getTime() + expectedHours * 60 * 60 * 1000);
};

const findVehicleUsageConflict = async ({ licensePlate, start, end }) => {
  const [overlappingBooking, activeSessions] = await Promise.all([
    Booking.findOne({
      licensePlate,
      status: { $in: BOOKING_STATUSES_THAT_BLOCK_SLOT },
      startTime: { $lt: end },
      endTime: { $gt: start },
    })
      .select('slotCode startTime endTime status')
      .lean(),
    Session.find({
      licensePlate,
      status: 'active',
    })
      .select('parkingSlot checkInTime expectedDurationHours')
      .lean(),
  ]);

  if (overlappingBooking) {
    return {
      type: 'booking',
      message: 'This vehicle already has another booking during the selected time range. One license plate can only park once at a time.',
      conflict: overlappingBooking,
    };
  }

  const overlappingSession = activeSessions.find((session) => {
    const sessionStart = new Date(session.checkInTime);
    const sessionEnd = getSessionExpectedEndTime(session);
    if (Number.isNaN(sessionStart.getTime()) || !sessionEnd) return false;
    return sessionStart < end && sessionEnd > start;
  });

  if (overlappingSession) {
    return {
      type: 'session',
      message: 'This vehicle is already scheduled to be parked during the selected time range. Please choose a later time.',
      conflict: overlappingSession,
    };
  }

  return null;
};

const getBookingServices = async (bookingIds) => {
  const services = await BookingService.find({ bookingId: { $in: bookingIds } })
    .sort({ createdAt: 1 })
    .lean();

  return services.reduce((acc, service) => {
    const key = String(service.bookingId);
    acc[key] = acc[key] || [];
    acc[key].push(service);
    return acc;
  }, {});
};

const emitBookingChanged = (app, booking, extra = {}) => {
  if (!app || !booking?.userId) return;

  const io = app.get('io');
  if (!io) return;

  emitToUser(io, booking.userId, 'booking:changed', {
    bookingId: String(booking._id),
    status: booking.status,
    slotCode: booking.slotCode,
    floorId: booking.floorId ? String(booking.floorId) : null,
    ...extra,
  });
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    const slots = await getAvailableSlotsForRange(start, end, req.user?._id);

    res.status(200).json({
      success: true,
      data: {
        startTime: start,
        endTime: end,
        count: slots.length,
        slots,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const { startTime, endTime, floorId, slotCode, vehicleId, licensePlate, serviceIds = [], ticketPackageId } = req.body;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    const plate = await resolveLicensePlate(req.user._id, { vehicleId, licensePlate });
    const requestedServiceIds = [...new Set((serviceIds || []).map(String))];

    const vehicleUsageConflict = await findVehicleUsageConflict({
      licensePlate: plate,
      start,
      end,
    });

    if (vehicleUsageConflict) {
      return res.status(409).json({
        success: false,
        message: vehicleUsageConflict.message,
        data: {
          conflictType: vehicleUsageConflict.type,
          conflict: vehicleUsageConflict.conflict,
        },
      });
    }

    // Determine if user is VIP
    const User = require('../models/User'); // Ensure imported
    const user = await User.findById(req.user._id);
    const isVip = user.membership?.isVip && user.membership?.expireAt > new Date();

    const availableSlots = await getAvailableSlotsForRange(start, end, req.user._id);
    let selectedSlot = null;

    if (floorId && slotCode) {
      const selectedKey = buildSlotKey(floorId, slotCode);
      selectedSlot = availableSlots.find((slot) => buildSlotKey(slot.floorId, slot.slotCode) === selectedKey);

      if (!selectedSlot) {
        return res.status(409).json({
          success: false,
          message: 'Selected slot is not available for this time range',
        });
      }
    } else {
      selectedSlot = availableSlots[0];
    }

    if (!selectedSlot) {
      return res.status(409).json({
        success: false,
        message: 'No available parking slot for this time range',
      });
    }

    const services = requestedServiceIds.length
      ? await Service.find({ _id: { $in: requestedServiceIds }, isActive: true }).lean()
      : [];

    if (services.length !== requestedServiceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected services are invalid or inactive',
      });
    }

    // Auto determine price
    const durationMs = end.getTime() - start.getTime();
    let paidHours = Math.ceil(durationMs / 3600000);
    if (paidHours < 1) paidHours = 1;

    let prepaidAmount = 0;
    
    // Fetch default hourly package
    const hourlyPackage = await TicketPackage.findOne({ type: 'hourly', isActive: true });
    const hourlyRate = hourlyPackage ? hourlyPackage.price : 10000;
    prepaidAmount = paidHours * hourlyRate;

    // Check if selected slot is reserved for this user (VIP)
    // We need to fetch the slot from DB to check reservedFor
    const slotDoc = await Slot.findOne({ floorID: selectedSlot.floorId, slotNumber: selectedSlot.slotCode });
    if (isVip && slotDoc && slotDoc.reservedFor && slotDoc.reservedFor.toString() === req.user._id.toString()) {
      prepaidAmount = 0; // Free for VIP parking in their own slot
    }

    const serviceTotal = services.reduce((total, service) => total + Number(service.price || 0), 0);
    let totalAmount = prepaidAmount + serviceTotal;
      
    // Handle free services for Yearly VIP
    if (isVip && user.membership.freeServiceCount > 0 && serviceTotal > 0) {
      // Use 1 free service count
      user.membership.freeServiceCount -= 1;
      await user.save();
      totalAmount -= serviceTotal; // Free services
      if (totalAmount < 0) totalAmount = 0;
    }

    // Check wallet balance BEFORE creating the booking to avoid ghost CANCELLED bookings
    const wallet = await walletService.getBalance(req.user._id);
    if (!wallet || wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    const booking = await Booking.create({
      userId: req.user._id,
      floorId: selectedSlot.floorId,
      slotCode: selectedSlot.slotCode,
      licensePlate: plate,
      startTime: start,
      endTime: end,
      paidHours,
      hourlyRate: hourlyRate, // For legacy compatibility or general reference
      prepaidAmount,
      serviceAmount: serviceTotal,
      finalAmount: totalAmount,
      ticketPackageId: hourlyPackage ? hourlyPackage._id : null,
      paymentMethod: 'wallet',
      paymentStatus: 'failed',
    });

    try {
      await walletService.debitWallet(
        req.user._id,
        totalAmount,
        `Booking payment for ${selectedSlot.slotCode} - ${plate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    } catch (walletError) {
      booking.status = 'cancelled';
      booking.paymentStatus = 'failed';
      await booking.save();
      throw walletError;
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    if (services.length > 0) {
      await BookingService.insertMany(
        services.map((service) => ({
          bookingId: booking._id,
          serviceId: service._id,
          serviceName: service.name,
          price: service.price,
          timeCost: service.timeCost || 30,
        }))
      );
    }

    const bookingServices = await BookingService.find({ bookingId: booking._id }).lean();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking,
        services: bookingServices,
        slot: selectedSlot,
      },
    });

    emitBookingChanged(req.app, booking, { action: 'created' });
  } catch (error) {
    next(error);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('floorId', 'name floorNumber')
      .sort({ createdAt: -1 })
      .lean();

    const serviceMap = await getBookingServices(bookings.map((booking) => booking._id));

    res.status(200).json({
      success: true,
      data: bookings.map((booking) => ({
        ...booking,
        services: serviceMap[String(booking._id)] || [],
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.checkInBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be checked in' });
    }

    const existingPlateSession = await Session.findOne({
      licensePlate: booking.licensePlate,
      status: 'active',
    });

    if (existingPlateSession) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle already has an active parking session',
      });
    }

    const existingSlotSession = await Session.findOne({
      floorId: booking.floorId,
      parkingSlot: booking.slotCode,
      status: 'active',
    });

    if (existingSlotSession) {
      return res.status(409).json({
        success: false,
        message: 'This slot is currently occupied',
      });
    }

    const parkingSession = await Session.create({
      source: 'app_booking',
      licensePlate: booking.licensePlate,
      userId: booking.userId,
      bookingId: booking._id,
      parkingSlot: booking.slotCode,
      floorId: booking.floorId,
      checkInTime: new Date(),
      expectedDurationHours: booking.paidHours,
      hourlyRate: booking.hourlyRate,
      prepaidAmount: booking.prepaidAmount,
      totalPrice: booking.finalAmount,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      status: 'active',
    });

    booking.status = 'active';
    booking.sessionId = parkingSession._id;
    await booking.save();

    emitBookingChanged(req.app, booking, { action: 'checked_in' });

    res.status(200).json({
      success: true,
      message: 'Booking checked in successfully',
      data: {
        booking,
        session: parkingSession,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.checkOutBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id }).populate('ticketPackageId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'active' || !booking.sessionId) {
      return res.status(400).json({ success: false, message: 'Booking is not active' });
    }

    const parkingSession = await Session.findById(booking.sessionId);

    if (!parkingSession || parkingSession.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - parkingSession.checkInTime.getTime();
    const actualHours = Math.max(1, Math.ceil(durationMs / 3600000));

    let refundHours = 0;
    let refundAmount = 0;
    let finalParkingAmount = booking.prepaidAmount;

    // Only hourly packages are refundable. Daily packages are not refunded for early exits.
    if (!booking.ticketPackageId || booking.ticketPackageId.type !== 'daily') {
      refundHours = Math.max(booking.paidHours - actualHours, 0);
      refundAmount = refundHours * booking.hourlyRate;
      finalParkingAmount = (booking.paidHours - refundHours) * booking.hourlyRate;
    }

    const finalAmount = finalParkingAmount + booking.serviceAmount;

    if (refundAmount > 0) {
      await walletService.creditWallet(
        booking.userId,
        refundAmount,
        'REFUND',
        `Booking refund for ${booking.slotCode} - ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    }

    booking.status = 'completed';
    booking.finalAmount = finalAmount;
    booking.refundAmount = refundAmount;
    booking.paymentStatus = refundAmount > 0 ? 'partially_refunded' : 'paid';
    await booking.save();

    parkingSession.status = 'completed';
    parkingSession.exitRequestedAt = checkOutTime;
    parkingSession.checkOutTime = checkOutTime;
    parkingSession.totalPrice = finalAmount;
    parkingSession.refundAmount = refundAmount;
    parkingSession.paymentStatus = refundAmount > 0 ? 'refunded' : 'paid';
    await parkingSession.save();

    emitBookingChanged(req.app, booking, {
      action: 'checked_out',
      refundAmount,
      finalAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Booking checked out successfully',
      data: {
        booking,
        session: parkingSession,
        actualHours,
        refundHours,
        refundAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
