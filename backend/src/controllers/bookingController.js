const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const ParkingFloor = require('../models/ParkingFloor');
const Service = require('../models/Service');
const Session = require('../models/Session');
const Vehicle = require('../models/Vehicle');
const walletService = require('../services/walletService');

const DEFAULT_HOURLY_RATE = Number(process.env.PARKING_HOURLY_RATE || 10000);
const BOOKING_STATUSES_THAT_BLOCK_SLOT = ['confirmed', 'active'];

const normalizePlate = (plate = '') => String(plate).trim().toUpperCase();
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
      .map((slot) => {
        const zone = slot.parentId ? elementById.get(slot.parentId) : null;
        return {
          floorId: floor._id,
          floorName: floor.name,
          floorNumber: floor.floorNumber,
          slotCode: normalizeSlotCode(slot.name || slot.id),
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

const getUnavailableSlotKeys = async (start, end) => {
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

  const unavailable = new Set();

  overlappingBookings.forEach((booking) => {
    unavailable.add(buildSlotKey(booking.floorId, booking.slotCode));
  });

  activeSessions.forEach((session) => {
    unavailable.add(buildSlotKey(session.floorId, session.parkingSlot));
  });

  return unavailable;
};

const getAvailableSlotsForRange = async (start, end) => {
  const [slots, unavailableSlotKeys] = await Promise.all([
    getAllBookableSlots(),
    getUnavailableSlotKeys(start, end),
  ]);

  return slots.filter((slot) => !unavailableSlotKeys.has(buildSlotKey(slot.floorId, slot.slotCode)));
};

const resolveLicensePlate = async (userId, { vehicleId, licensePlate }) => {
  if (vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: userId }).lean();
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
    }
    return normalizePlate(vehicle.licensePlate);
  }

  const plate = normalizePlate(licensePlate);
  if (!plate) {
    throw Object.assign(new Error('licensePlate or vehicleId is required'), { statusCode: 400 });
  }
  return plate;
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

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    const slots = await getAvailableSlotsForRange(start, end);

    res.status(200).json({
      success: true,
      data: {
        startTime: start,
        endTime: end,
        hourlyRate: DEFAULT_HOURLY_RATE,
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
    const { startTime, endTime, floorId, slotCode, vehicleId, licensePlate, serviceIds = [] } = req.body;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    const plate = await resolveLicensePlate(req.user._id, { vehicleId, licensePlate });
    const requestedServiceIds = [...new Set((serviceIds || []).map(String))];

    const availableSlots = await getAvailableSlotsForRange(start, end);
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

    const paidHours = Math.ceil((end.getTime() - start.getTime()) / 3600000);
    const prepaidAmount = paidHours * DEFAULT_HOURLY_RATE;
    const serviceAmount = services.reduce((total, service) => total + Number(service.price || 0), 0);
    const totalAmount = prepaidAmount + serviceAmount;

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
      hourlyRate: DEFAULT_HOURLY_RATE,
      prepaidAmount,
      serviceAmount,
      finalAmount: totalAmount,
      paymentMethod: 'wallet',
      paymentStatus: 'failed',
    });

    try {
      await walletService.debitWallet(
        req.user._id,
        totalAmount,
        `Thanh toan dat cho ${selectedSlot.slotCode} - ${plate}`,
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
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

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
    const refundHours = Math.max(booking.paidHours - actualHours, 0);
    const refundAmount = refundHours * booking.hourlyRate;
    const finalParkingAmount = (booking.paidHours - refundHours) * booking.hourlyRate;
    const finalAmount = finalParkingAmount + booking.serviceAmount;

    if (refundAmount > 0) {
      await walletService.creditWallet(
        booking.userId,
        refundAmount,
        'REFUND',
        `Hoan tien dat cho ${booking.slotCode} - ${booking.licensePlate}`,
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
