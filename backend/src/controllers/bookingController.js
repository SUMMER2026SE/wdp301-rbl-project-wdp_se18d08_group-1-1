const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingHold = require('../models/BookingHold');
const BookingOrder = require('../models/BookingOrder');
const BookingService = require('../models/BookingService');
const ParkingFloor = require('../models/ParkingFloor');
const Service = require('../models/Service');
const Session = require('../models/Session');
const Vehicle = require('../models/Vehicle');
const Slot = require('../models/Slot');
const TicketPackage = require('../models/TicketPackage');
const User = require('../models/User');
const walletService = require('../services/walletService');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');
const { calculateBookingPrice } = require('../utils/bookingPricing');
const { emitToUser } = require('../sockets/notificationSocket');

const BOOKING_STATUSES_THAT_BLOCK_SLOT = ['confirmed', 'active'];
const HOLD_TTL_MS = 3 * 60 * 1000;
const NO_SHOW_GRACE_MS = 15 * 60 * 1000;
const MIN_BOOKING_MINUTES = 30;
const MAX_BOOKING_HOURS = 24;
const MAX_BULK_BOOKING_ITEMS = 5;

const normalizeSlotCode = (slotCode = '') => String(slotCode).trim().toUpperCase();

const buildSlotKey = (floorId, slotCode) => `${String(floorId)}:${normalizeSlotCode(slotCode)}`;

const sameObjectId = (a, b) => String(a || '') === String(b || '');

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

const validateBookableTimeRange = (start, end) => {
  const now = new Date();
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;

  if (start.getTime() + 60000 < now.getTime()) {
    throw Object.assign(new Error('Start time cannot be in the past'), { statusCode: 400 });
  }

  if (durationMinutes < MIN_BOOKING_MINUTES) {
    throw Object.assign(new Error(`Minimum booking duration is ${MIN_BOOKING_MINUTES} minutes`), { statusCode: 400 });
  }

  if (durationMinutes > MAX_BOOKING_HOURS * 60) {
    throw Object.assign(new Error(`Maximum booking duration is ${MAX_BOOKING_HOURS} hours`), { statusCode: 400 });
  }
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

const getAllBookableSlots = async (options = {}) => {
  let floorQuery = ParkingFloor.find().sort({ floorNumber: 1 });
  if (options.session) floorQuery = floorQuery.session(options.session);
  const floors = await floorQuery.lean();

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

const getUnavailableSlotKeys = async (start, end, userId = null, options = {}) => {
  const bookingQuery = {
    status: { $in: BOOKING_STATUSES_THAT_BLOCK_SLOT },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  if (options.excludeBookingId) {
    bookingQuery._id = { $ne: options.excludeBookingId };
  }

  const activeSessionQuery = {
    status: 'active',
    floorId: { $ne: null },
    parkingSlot: { $ne: null },
  };

  if (options.excludeSessionId) {
    activeSessionQuery._id = { $ne: options.excludeSessionId };
  }

  const now = new Date();

  const holdQuery = {
    status: 'active',
    expiresAt: { $gt: now },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  if (userId) {
    holdQuery.userId = { $ne: userId };
  }

  let overlappingBookingsQuery = Booking.find(bookingQuery).select('floorId slotCode');
  let activeSessionsQuery = Session.find(activeSessionQuery).select('floorId parkingSlot');
  let maintenanceSlotsQuery = Slot.find({ status: 'maintenance' }).select('floorID slotNumber');
  let activeHoldsQuery = BookingHold.find(holdQuery).select('floorId slotCode');

  if (options.session) {
    overlappingBookingsQuery = overlappingBookingsQuery.session(options.session);
    activeSessionsQuery = activeSessionsQuery.session(options.session);
    maintenanceSlotsQuery = maintenanceSlotsQuery.session(options.session);
    activeHoldsQuery = activeHoldsQuery.session(options.session);
  }

  const overlappingBookings = await overlappingBookingsQuery.lean();
  const activeSessions = await activeSessionsQuery.lean();
  const maintenanceSlots = await maintenanceSlotsQuery.lean();
  const activeHolds = await activeHoldsQuery.lean();

  // Find slots reserved for other users
  const reservedSlotsQuery = { reservedFor: { $ne: null } };
  if (userId) {
    reservedSlotsQuery.reservedFor = { $ne: userId };
  }
  let reservedSlotsQueryBuilder = Slot.find(reservedSlotsQuery).select('floorID slotNumber');
  if (options.session) reservedSlotsQueryBuilder = reservedSlotsQueryBuilder.session(options.session);
  const reservedSlots = await reservedSlotsQueryBuilder.lean();

  const unavailable = new Set();

  overlappingBookings.forEach((booking) => {
    unavailable.add(buildSlotKey(booking.floorId, booking.slotCode));
  });

  activeSessions.forEach((session) => {
    unavailable.add(buildSlotKey(session.floorId, session.parkingSlot));
  });

  activeHolds.forEach((hold) => {
    unavailable.add(buildSlotKey(hold.floorId, hold.slotCode));
  });

  maintenanceSlots.forEach((slot) => {
    unavailable.add(buildSlotKey(slot.floorID, slot.slotNumber));
  });

  reservedSlots.forEach((slot) => {
    unavailable.add(buildSlotKey(slot.floorID, slot.slotNumber));
  });

  return unavailable;
};

const getAvailableSlotsForRange = async (start, end, userId = null, options = {}) => {
  const [slots, unavailableSlotKeys] = await Promise.all([
    getAllBookableSlots(options),
    getUnavailableSlotKeys(start, end, userId, options),
  ]);

  return slots.filter((slot) => !unavailableSlotKeys.has(buildSlotKey(slot.floorId, slot.slotCode)));
};

const resolveLicensePlate = async (userId, { vehicleId, licensePlate }, options = {}) => {
  if (vehicleId) {
    let vehicleQuery = Vehicle.findOne({ _id: vehicleId, owner: userId });
    if (options.session) vehicleQuery = vehicleQuery.session(options.session);
    const vehicle = await vehicleQuery.lean();
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

const getActiveMembershipType = async (user, options = {}) => {
  if (!user?.membership?.isVip || !user?.membership?.expireAt || !user?.membership?.packageId) {
    return null;
  }

  const expireAt = new Date(user.membership.expireAt);
  if (Number.isNaN(expireAt.getTime()) || expireAt <= new Date()) {
    return null;
  }

  if (user.membership.packageId?.type) {
    return user.membership.packageId.type;
  }

  let ticketQuery = TicketPackage.findById(user.membership.packageId).select('type');
  if (options.session) ticketQuery = ticketQuery.session(options.session);
  const ticketPackage = await ticketQuery.lean();
  return ticketPackage?.type || null;
};

const findVipRegisteredVehicleBookingRestriction = async ({ userId, licensePlate, floorId, slotCode, session = null }) => {
  let userQuery = User.findById(userId).select('membership');
  let vehicleQuery = Vehicle.findOne({ owner: userId, licensePlate }).select('_id licensePlate');
  if (session) {
    userQuery = userQuery.session(session);
    vehicleQuery = vehicleQuery.session(session);
  }

  const [user, registeredVehicle] = await Promise.all([
    userQuery.lean(),
    vehicleQuery.lean(),
  ]);

  if (!registeredVehicle) return null;

  const membershipType = await getActiveMembershipType(user, { session });
  if (!['monthly', 'yearly'].includes(membershipType)) return null;

  let reservedSlotsQuery = Slot.find({ reservedFor: userId }).select('floorID slotNumber');
  if (session) reservedSlotsQuery = reservedSlotsQuery.session(session);
  const reservedSlots = await reservedSlotsQuery.lean();

  const isSelectedReservedSlot = reservedSlots.some((slot) => (
    sameObjectId(slot.floorID, floorId) &&
    normalizeSlotCode(slot.slotNumber) === normalizeSlotCode(slotCode)
  ));

  if (isSelectedReservedSlot) return null;

  return {
    membershipType,
    registeredVehicle,
    reservedSlots: reservedSlots.map((slot) => ({
      floorId: slot.floorID,
      slotCode: normalizeSlotCode(slot.slotNumber),
    })),
  };
};

const getSessionExpectedEndTime = (session) => {
  const start = new Date(session.checkInTime);
  if (Number.isNaN(start.getTime())) return null;

  const expectedHours = Math.max(Number(session.expectedDurationHours || 1), 1);
  return new Date(start.getTime() + expectedHours * 60 * 60 * 1000);
};

const findVehicleUsageConflict = async ({ licensePlate, start, end, excludeBookingId = null, session = null }) => {
  const bookingQuery = {
    licensePlate,
    status: { $in: BOOKING_STATUSES_THAT_BLOCK_SLOT },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  let overlappingBookingQuery = Booking.findOne(bookingQuery).select('slotCode startTime endTime status');
  let activeSessionsQuery = Session.find({
    licensePlate,
    status: 'active',
  }).select('parkingSlot checkInTime expectedDurationHours');

  if (session) {
    overlappingBookingQuery = overlappingBookingQuery.session(session);
    activeSessionsQuery = activeSessionsQuery.session(session);
  }

  const [overlappingBooking, activeSessions] = await Promise.all([
    overlappingBookingQuery.lean(),
    activeSessionsQuery.lean(),
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

const loadActiveServices = async (serviceIds = [], options = {}) => {
  const requestedServiceIds = [...new Set((serviceIds || []).map(String))];
  let serviceQuery = requestedServiceIds.length
    ? Service.find({ _id: { $in: requestedServiceIds }, isActive: true })
    : null;

  if (serviceQuery && options.session) serviceQuery = serviceQuery.session(options.session);
  const services = serviceQuery ? await serviceQuery.lean() : [];

  if (services.length !== requestedServiceIds.length) {
    throw Object.assign(new Error('One or more selected services are invalid or inactive'), { statusCode: 400 });
  }

  return services;
};

const getVipContext = async (userId, selectedSlot, options = {}) => {
  let userQuery = User.findById(userId);
  if (options.session) userQuery = userQuery.session(options.session);
  const user = await userQuery;
  const isVip = Boolean(user?.membership?.isVip && user.membership?.expireAt > new Date());
  let slotQuery = selectedSlot
    ? Slot.findOne({ floorID: selectedSlot.floorId, slotNumber: selectedSlot.slotCode })
    : null;
  if (slotQuery && options.session) slotQuery = slotQuery.session(options.session);
  const slotDoc = slotQuery ? await slotQuery : null;
  const isOwnVipSlot = Boolean(
    isVip &&
    slotDoc?.reservedFor &&
    slotDoc.reservedFor.toString() === userId.toString()
  );

  return { user, isVip, slotDoc, isOwnVipSlot };
};

const buildBookingPricing = ({ start, end, services = [], waiveParkingFee = false }) => {
  const basePricing = calculateBookingPrice(start, end);
  const parkingAmount = waiveParkingFee ? 0 : basePricing.totalAmount;
  const serviceTotal = services.reduce((total, service) => total + Number(service.price || 0), 0);
  const paidHours = basePricing.paidHours;
  const hourlyRate = paidHours > 0 ? Math.round(basePricing.usageAmount / paidHours) : 0;

  return {
    paidHours,
    hourlyRate,
    prepaidAmount: parkingAmount,
    serviceAmount: serviceTotal,
    totalAmount: parkingAmount + serviceTotal,
    pricingDetails: {
      ...basePricing,
      parkingWaived: waiveParkingFee,
      serviceAmount: serviceTotal,
    },
  };
};

const releaseUserActiveHolds = async (userId, exceptHoldId = null, options = {}) => {
  const query = {
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (exceptHoldId) {
    query._id = { $ne: exceptHoldId };
  }

  await BookingHold.updateMany(query, { status: 'released' }, options.session ? { session: options.session } : {});
};

const getActiveHoldForBooking = async (holdId, userId, selectedSlot, start, end) => {
  if (!holdId) return null;

  const hold = await BookingHold.findOne({
    _id: holdId,
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });

  if (!hold) {
    throw Object.assign(new Error('The selected slot hold has expired. Please select the slot again.'), { statusCode: 409 });
  }

  const holdMatchesSelection =
    sameObjectId(hold.floorId, selectedSlot.floorId) &&
    normalizeSlotCode(hold.slotCode) === normalizeSlotCode(selectedSlot.slotCode) &&
    hold.startTime.getTime() === start.getTime() &&
    hold.endTime.getTime() === end.getTime();

  if (!holdMatchesSelection) {
    throw Object.assign(new Error('The selected slot hold does not match this booking request.'), { statusCode: 409 });
  }

  return hold;
};

const expireOverdueBookingsForUser = async (app, userId) => {
  const expiryCutoff = new Date(Date.now() - NO_SHOW_GRACE_MS);
  const expiredBookings = await Booking.find({
    userId,
    status: 'confirmed',
    startTime: { $lt: expiryCutoff },
  });

  await Promise.all(expiredBookings.map(async (booking) => {
    booking.status = 'expired';
    await booking.save();
    emitBookingChanged(app, booking, {
      action: 'expired_no_show',
      reason: 'Late arrival over 15 minutes',
    });
  }));
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

const createBulkItemError = (clientItemId, code, message, field = null) => ({
  clientItemId,
  code,
  message,
  ...(field ? { field } : {}),
});

const intervalsOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const getClientItemId = (item, index) => (
  item?.clientItemId ? String(item.clientItemId) : `item-${index + 1}`
);

const throwBulkItemError = (code, message, statusCode = 400, field = null) => {
  const error = Object.assign(new Error(message), { statusCode, code });
  if (field) error.field = field;
  throw error;
};

const mapBulkItemException = (error) => ({
  code: error.code || (error.statusCode === 409 ? 'ITEM_CONFLICT' : 'ITEM_INVALID'),
  message: error.message || 'This booking item is invalid.',
  field: error.field || null,
});

const toBulkBookingItemResponse = (item) => ({
  clientItemId: item.clientItemId,
  vehicleId: item.vehicleId || null,
  licensePlate: item.licensePlate,
  floorId: item.floorId,
  floorName: item.selectedSlot.floorName || null,
  slotCode: item.slotCode,
  startTime: item.start,
  endTime: item.end,
  serviceIds: item.serviceIds,
  serviceAmount: item.pricing.serviceAmount,
  prepaidAmount: item.pricing.prepaidAmount,
  totalAmount: item.pricing.totalAmount,
  pricingDetails: item.pricing.pricingDetails,
});

const buildBulkSummary = async (userId, pricedItems, options = {}) => {
  const grandTotal = pricedItems.reduce((total, item) => total + Number(item.pricing.totalAmount || 0), 0);
  const wallet = await walletService.getOrCreateWallet(userId, { session: options.session });
  const walletBalance = Number(wallet?.balance || 0);
  const shortfall = Math.max(grandTotal - walletBalance, 0);

  return {
    grandTotal,
    walletBalance,
    shortfall,
    items: pricedItems.map(toBulkBookingItemResponse),
  };
};

const resolveSelectedSlotForBulkItem = async ({ userId, floorId, slotCode, start, end, session }) => {
  const availableSlots = await getAvailableSlotsForRange(start, end, userId, { session });
  const selectedSlotCode = normalizeSlotCode(slotCode);
  const selectedSlot = availableSlots.find((slot) => (
    sameObjectId(slot.floorId, floorId) &&
    normalizeSlotCode(slot.slotCode) === selectedSlotCode
  ));

  if (!selectedSlot) {
    throwBulkItemError('SLOT_UNAVAILABLE', 'Selected slot is no longer available.', 409, 'slotCode');
  }

  return selectedSlot;
};

const getBulkHoldForItem = async ({ item, userId, session }) => {
  if (!item.holdId) {
    throwBulkItemError('HOLD_REQUIRED', 'This item needs an active slot hold before checkout.', 409, 'holdId');
  }

  let holdQuery = BookingHold.findOne({
    _id: item.holdId,
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });
  if (session) holdQuery = holdQuery.session(session);

  const hold = await holdQuery;
  if (!hold) {
    throwBulkItemError('HOLD_EXPIRED', 'The slot hold has expired. Please review checkout again.', 409, 'holdId');
  }

  const holdMatches =
    sameObjectId(hold.floorId, item.floorId) &&
    normalizeSlotCode(hold.slotCode) === normalizeSlotCode(item.slotCode) &&
    hold.startTime.getTime() === item.start.getTime() &&
    hold.endTime.getTime() === item.end.getTime();

  if (!holdMatches) {
    throwBulkItemError('HOLD_MISMATCH', 'The slot hold does not match this booking item.', 409, 'holdId');
  }

  return hold;
};

const addBulkInCartConflicts = (pricedItems, itemErrors) => {
  const errored = new Set(itemErrors.map((error) => error.clientItemId));

  for (let i = 0; i < pricedItems.length; i += 1) {
    for (let j = i + 1; j < pricedItems.length; j += 1) {
      const first = pricedItems[i];
      const second = pricedItems[j];
      if (!intervalsOverlap(first.start, first.end, second.start, second.end)) continue;

      if (first.licensePlate === second.licensePlate && !errored.has(second.clientItemId)) {
        itemErrors.push(createBulkItemError(
          second.clientItemId,
          'DUPLICATE_PLATE_IN_CART',
          'This vehicle already has another overlapping item in the cart.',
          'licensePlate'
        ));
        errored.add(second.clientItemId);
      }

      if (
        buildSlotKey(first.floorId, first.slotCode) === buildSlotKey(second.floorId, second.slotCode) &&
        !errored.has(second.clientItemId)
      ) {
        itemErrors.push(createBulkItemError(
          second.clientItemId,
          'DUPLICATE_SLOT_IN_CART',
          'This slot is already selected by another overlapping item in the cart.',
          'slotCode'
        ));
        errored.add(second.clientItemId);
      }
    }
  }
};

const validateBulkBookingItems = async (userId, items, options = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('items must be a non-empty array'), { statusCode: 400 });
  }

  if (items.length > MAX_BULK_BOOKING_ITEMS) {
    throw Object.assign(new Error(`Maximum cart size is ${MAX_BULK_BOOKING_ITEMS} vehicles`), { statusCode: 400 });
  }

  const pricedItems = [];
  const itemErrors = [];

  for (let index = 0; index < items.length; index += 1) {
    const rawItem = items[index] || {};
    const clientItemId = getClientItemId(rawItem, index);

    try {
      if (!rawItem.floorId) {
        throwBulkItemError('FLOOR_REQUIRED', 'floorId is required.', 400, 'floorId');
      }
      if (!rawItem.slotCode) {
        throwBulkItemError('SLOT_REQUIRED', 'slotCode is required.', 400, 'slotCode');
      }

      const { start, end } = parseBookingTimeRange(rawItem.startTime, rawItem.endTime);
      validateBookableTimeRange(start, end);
      const licensePlate = await resolveLicensePlate(
        userId,
        { vehicleId: rawItem.vehicleId, licensePlate: rawItem.licensePlate },
        { session: options.session }
      );
      const slotCode = normalizeSlotCode(rawItem.slotCode);
      const selectedSlot = await resolveSelectedSlotForBulkItem({
        userId,
        floorId: rawItem.floorId,
        slotCode,
        start,
        end,
        session: options.session,
      });

      const vipBookingRestriction = await findVipRegisteredVehicleBookingRestriction({
        userId,
        licensePlate,
        floorId: selectedSlot.floorId,
        slotCode: selectedSlot.slotCode,
        session: options.session,
      });

      if (vipBookingRestriction) {
        throwBulkItemError(
          'ACTIVE_MEMBERSHIP_SLOT_REQUIRED',
          'This registered vehicle is covered by an active VIP membership. Please use the assigned VIP slot.',
          409,
          'slotCode'
        );
      }

      const vehicleUsageConflict = await findVehicleUsageConflict({
        licensePlate,
        start,
        end,
        session: options.session,
      });

      if (vehicleUsageConflict) {
        throwBulkItemError(
          'PLATE_TIME_CONFLICT',
          vehicleUsageConflict.message,
          409,
          'licensePlate'
        );
      }

      const services = await loadActiveServices(rawItem.serviceIds || [], { session: options.session });
      const { isOwnVipSlot } = await getVipContext(userId, selectedSlot, { session: options.session });
      const pricing = buildBookingPricing({
        start,
        end,
        services,
        waiveParkingFee: isOwnVipSlot,
      });

      const normalizedItem = {
        clientItemId,
        vehicleId: rawItem.vehicleId || null,
        licensePlate,
        floorId: selectedSlot.floorId,
        slotCode: selectedSlot.slotCode,
        start,
        end,
        serviceIds: (rawItem.serviceIds || []).map(String),
        services,
        pricing,
        selectedSlot,
        holdId: rawItem.holdId || null,
      };

      if (options.requireHold) {
        normalizedItem.hold = await getBulkHoldForItem({
          item: normalizedItem,
          userId,
          session: options.session,
        });
      }

      pricedItems.push(normalizedItem);
    } catch (error) {
      const mapped = mapBulkItemException(error);
      itemErrors.push(createBulkItemError(clientItemId, mapped.code, mapped.message, mapped.field));
    }
  }

  addBulkInCartConflicts(pricedItems, itemErrors);

  return { pricedItems, itemErrors };
};

const sendBulkValidationError = (res, itemErrors, extraData = {}) => (
  res.status(409).json({
    success: false,
    code: 'BULK_BOOKING_VALIDATION_FAILED',
    message: 'One or more booking items need attention.',
    data: {
      ...extraData,
      itemErrors,
    },
  })
);

const buildBookingOrderResponse = async (orderId, options = {}) => {
  let orderQuery = BookingOrder.findById(orderId);
  let bookingQuery = Booking.find({ orderId }).populate('floorId', 'name floorNumber').sort({ orderItemIndex: 1 });
  if (options.session) {
    orderQuery = orderQuery.session(options.session);
    bookingQuery = bookingQuery.session(options.session);
  }

  const [order, bookings] = await Promise.all([
    orderQuery.lean(),
    bookingQuery.lean(),
  ]);

  if (!order) return null;

  const serviceMap = await getBookingServices(bookings.map((booking) => booking._id));

  return {
    bookingOrderId: order._id,
    order,
    grandTotal: order.grandTotal,
    walletTransactionId: order.walletTransactionId,
    bookings: bookings.map((booking) => ({
      clientItemId: booking.clientItemId,
      bookingId: booking._id,
      qrCode: String(booking._id),
      slotCode: booking.slotCode,
      floorId: booking.floorId?._id || booking.floorId,
      floorName: booking.floorId?.name || null,
      licensePlate: booking.licensePlate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.finalAmount,
      status: booking.status,
      services: serviceMap[String(booking._id)] || [],
    })),
  };
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    validateBookableTimeRange(start, end);
    const slots = await getAvailableSlotsForRange(start, end, req.user?._id);
    const pricing = calculateBookingPrice(start, end);

    res.status(200).json({
      success: true,
      data: {
        startTime: start,
        endTime: end,
        pricing,
        count: slots.length,
        slots,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.quoteBooking = async (req, res, next) => {
  try {
    const { startTime, endTime, serviceIds = [] } = req.body;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    validateBookableTimeRange(start, end);

    const services = await loadActiveServices(serviceIds);
    const pricing = buildBookingPricing({ start, end, services });

    res.status(200).json({
      success: true,
      data: {
        startTime: start,
        endTime: end,
        ...pricing,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBookingHold = async (req, res, next) => {
  try {
    const { startTime, endTime, floorId, slotCode, vehicleId, licensePlate } = req.body;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    validateBookableTimeRange(start, end);

    if (!floorId || !slotCode) {
      return res.status(400).json({ success: false, message: 'floorId and slotCode are required' });
    }

    const plate = await resolveLicensePlate(req.user._id, { vehicleId, licensePlate });
    const selectedSlotCode = normalizeSlotCode(slotCode);
    const availableSlots = await getAvailableSlotsForRange(start, end, req.user._id);
    const selectedSlot = availableSlots.find((slot) => (
      sameObjectId(slot.floorId, floorId) &&
      normalizeSlotCode(slot.slotCode) === selectedSlotCode
    ));

    if (!selectedSlot) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot is not available anymore. Please pick another slot.',
      });
    }

    const vipBookingRestriction = await findVipRegisteredVehicleBookingRestriction({
      userId: req.user._id,
      licensePlate: plate,
      floorId: selectedSlot.floorId,
      slotCode: selectedSlot.slotCode,
    });

    if (vipBookingRestriction) {
      return res.status(409).json({
        success: false,
        message: 'This registered vehicle is already covered by an active VIP membership. Please use your assigned VIP slot instead of booking another slot.',
        data: {
          conflictType: 'active_membership',
          membershipType: vipBookingRestriction.membershipType,
          licensePlate: plate,
          reservedSlots: vipBookingRestriction.reservedSlots,
        },
      });
    }

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

    await releaseUserActiveHolds(req.user._id);

    const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
    const hold = await BookingHold.create({
      userId: req.user._id,
      floorId: selectedSlot.floorId,
      slotCode: selectedSlot.slotCode,
      licensePlate: plate,
      startTime: start,
      endTime: end,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: 'Slot hold created',
      data: {
        hold,
        expiresAt,
        ttlSeconds: Math.floor(HOLD_TTL_MS / 1000),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.releaseBookingHold = async (req, res, next) => {
  try {
    const hold = await BookingHold.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        status: 'active',
      },
      { status: 'released' },
      { new: true }
    );

    if (!hold) {
      return res.status(404).json({ success: false, message: 'Active hold not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Slot hold released',
      data: hold,
    });
  } catch (error) {
    next(error);
  }
};

exports.quoteBulkBooking = async (req, res, next) => {
  try {
    const { pricedItems, itemErrors } = await validateBulkBookingItems(req.user._id, req.body.items || []);
    const summary = await buildBulkSummary(req.user._id, pricedItems);

    if (itemErrors.length > 0) {
      return sendBulkValidationError(res, itemErrors, summary);
    }

    res.status(200).json({
      success: true,
      data: {
        ...summary,
        itemErrors: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBulkBookingHolds = async (req, res, next) => {
  let session = null;

  try {
    const { pricedItems, itemErrors } = await validateBulkBookingItems(req.user._id, req.body.items || []);
    const summary = await buildBulkSummary(req.user._id, pricedItems);

    if (itemErrors.length > 0) {
      return sendBulkValidationError(res, itemErrors, summary);
    }

    session = await mongoose.startSession();
    session.startTransaction();

    await releaseUserActiveHolds(req.user._id, null, { session });

    const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
    const holdGroupId = crypto.randomUUID();
    const holds = await BookingHold.insertMany(
      pricedItems.map((item) => ({
        userId: req.user._id,
        floorId: item.floorId,
        slotCode: item.slotCode,
        licensePlate: item.licensePlate,
        startTime: item.start,
        endTime: item.end,
        expiresAt,
        clientItemId: item.clientItemId,
        holdGroupId,
      })),
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Bulk slot holds created',
      data: {
        ...summary,
        expiresAt,
        ttlSeconds: Math.floor(HOLD_TTL_MS / 1000),
        holdGroupId,
        holds: holds.map((hold) => ({
          clientItemId: hold.clientItemId,
          holdId: hold._id,
          floorId: hold.floorId,
          slotCode: hold.slotCode,
          expiresAt: hold.expiresAt,
        })),
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.releaseBulkBookingHolds = async (req, res, next) => {
  try {
    const holdIds = Array.isArray(req.body?.holdIds) ? req.body.holdIds : [];

    if (holdIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'holdIds must be a non-empty array',
      });
    }

    const result = await BookingHold.updateMany(
      {
        _id: { $in: holdIds },
        userId: req.user._id,
        status: 'active',
      },
      { status: 'released' }
    );

    res.status(200).json({
      success: true,
      message: 'Bulk slot holds released',
      data: {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBulkBooking = async (req, res, next) => {
  const { idempotencyKey, items = [] } = req.body;

  if (!idempotencyKey || !String(idempotencyKey).trim()) {
    return res.status(400).json({
      success: false,
      message: 'idempotencyKey is required',
    });
  }

  try {
    const existingOrder = await BookingOrder.findOne({
      userId: req.user._id,
      idempotencyKey: String(idempotencyKey).trim(),
    }).lean();

    if (existingOrder?.status === 'paid') {
      const existingData = await buildBookingOrderResponse(existingOrder._id);
      return res.status(200).json({
        success: true,
        message: 'Bulk booking already processed',
        data: existingData,
      });
    }
  } catch (error) {
    return next(error);
  }

  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { pricedItems, itemErrors } = await validateBulkBookingItems(req.user._id, items, {
      requireHold: true,
      session,
    });
    const summary = await buildBulkSummary(req.user._id, pricedItems, { session });

    if (itemErrors.length > 0) {
      await session.abortTransaction();
      return sendBulkValidationError(res, itemErrors, summary);
    }

    if (summary.shortfall > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: 'Wallet balance is not enough for this checkout.',
        data: summary,
      });
    }

    const wallet = await walletService.getOrCreateWallet(req.user._id, { session });
    if (wallet.status === 'frozen') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'Wallet is frozen',
      });
    }

    const [order] = await BookingOrder.create(
      [
        {
          userId: req.user._id,
          status: 'pending',
          itemCount: pricedItems.length,
          grandTotal: summary.grandTotal,
          idempotencyKey: String(idempotencyKey).trim(),
          metadata: {
            source: 'bulk_booking_cart',
            clientItemIds: pricedItems.map((item) => item.clientItemId),
          },
        },
      ],
      { session }
    );

    let hourlyPackageQuery = TicketPackage.findOne({ type: 'hourly', isActive: true });
    hourlyPackageQuery = hourlyPackageQuery.session(session);
    const hourlyPackage = await hourlyPackageQuery;

    const bookingDocs = pricedItems.map((item, index) => ({
      userId: req.user._id,
      orderId: order._id,
      orderItemIndex: index,
      clientItemId: item.clientItemId,
      floorId: item.floorId,
      slotCode: item.slotCode,
      licensePlate: item.licensePlate,
      startTime: item.start,
      endTime: item.end,
      paidHours: item.pricing.paidHours,
      hourlyRate: item.pricing.hourlyRate,
      prepaidAmount: item.pricing.prepaidAmount,
      serviceAmount: item.pricing.serviceAmount,
      finalAmount: item.pricing.totalAmount,
      ticketPackageId: hourlyPackage ? hourlyPackage._id : null,
      holdId: item.hold?._id || item.holdId || null,
      pricingDetails: item.pricing.pricingDetails,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
    }));

    const bookings = await Booking.insertMany(bookingDocs, { session });

    const serviceDocs = [];
    pricedItems.forEach((item, index) => {
      item.services.forEach((service) => {
        serviceDocs.push({
          bookingId: bookings[index]._id,
          serviceId: service._id,
          serviceName: service.name,
          price: service.price,
          timeCost: service.timeCost || 30,
        });
      });
    });

    if (serviceDocs.length > 0) {
      await BookingService.insertMany(serviceDocs, { session });
    }

    let walletTransaction = null;
    if (summary.grandTotal > 0) {
      const debitResult = await walletService.debitWallet(
        req.user._id,
        summary.grandTotal,
        `Bulk booking payment for ${pricedItems.length} vehicle(s)`,
        {
          refSource: 'booking_order',
          refSourceId: order._id,
          session,
        }
      );
      walletTransaction = debitResult.transaction;
    }

    const holdIds = pricedItems.map((item) => item.hold?._id || item.holdId).filter(Boolean);
    const holdUpdate = await BookingHold.updateMany(
      {
        _id: { $in: holdIds },
        userId: req.user._id,
        status: 'active',
      },
      { status: 'consumed' },
      { session }
    );

    if ((holdUpdate.modifiedCount || 0) !== holdIds.length) {
      throw Object.assign(new Error('One or more slot holds could not be consumed'), { statusCode: 409 });
    }

    order.status = 'paid';
    order.walletTransactionId = walletTransaction?._id || null;
    await order.save({ session });

    await session.commitTransaction();

    bookings.forEach((booking) => {
      emitBookingChanged(req.app, booking, { action: 'created', orderId: String(order._id) });
    });

    const data = await buildBookingOrderResponse(order._id);

    res.status(201).json({
      success: true,
      message: 'Bulk booking created successfully',
      data,
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    if (error.code === 11000) {
      const existingOrder = await BookingOrder.findOne({
        userId: req.user._id,
        idempotencyKey: String(idempotencyKey).trim(),
      }).lean();
      if (existingOrder?.status === 'paid') {
        const existingData = await buildBookingOrderResponse(existingOrder._id);
        return res.status(200).json({
          success: true,
          message: 'Bulk booking already processed',
          data: existingData,
        });
      }
    }

    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.getBookingOrder = async (req, res, next) => {
  try {
    const order = await BookingOrder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Booking order not found' });
    }

    const data = await buildBookingOrderResponse(order._id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const { startTime, endTime, floorId, slotCode, vehicleId, licensePlate, serviceIds = [], holdId } = req.body;
    const { start, end } = parseBookingTimeRange(startTime, endTime);
    validateBookableTimeRange(start, end);
    const plate = await resolveLicensePlate(req.user._id, { vehicleId, licensePlate });

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

    const vipBookingRestriction = await findVipRegisteredVehicleBookingRestriction({
      userId: req.user._id,
      licensePlate: plate,
      floorId: selectedSlot.floorId,
      slotCode: selectedSlot.slotCode,
    });

    if (vipBookingRestriction) {
      return res.status(409).json({
        success: false,
        message: 'This registered vehicle is already covered by an active VIP membership. Please use your assigned VIP slot instead of booking another slot.',
        data: {
          conflictType: 'active_membership',
          membershipType: vipBookingRestriction.membershipType,
          licensePlate: plate,
          reservedSlots: vipBookingRestriction.reservedSlots,
        },
      });
    }

    const activeHold = await getActiveHoldForBooking(holdId, req.user._id, selectedSlot, start, end);
    if (activeHold) {
      await releaseUserActiveHolds(req.user._id, activeHold._id);
    }

    const services = await loadActiveServices(serviceIds);
    const hourlyPackage = await TicketPackage.findOne({ type: 'hourly', isActive: true });
    const { user, isVip, isOwnVipSlot } = await getVipContext(req.user._id, selectedSlot);
    const pricing = buildBookingPricing({
      start,
      end,
      services,
      waiveParkingFee: isOwnVipSlot,
    });

    let serviceAmount = pricing.serviceAmount;
    let totalAmount = pricing.totalAmount;
      
    // Handle free services for Yearly VIP
    if (isVip && user.membership.freeServiceCount > 0 && serviceAmount > 0) {
      // Use 1 free service count
      user.membership.freeServiceCount -= 1;
      await user.save();
      totalAmount -= serviceAmount; // Free services
      if (totalAmount < 0) totalAmount = 0;
      serviceAmount = 0;
    }

    // Check wallet balance BEFORE creating the booking to avoid ghost CANCELLED bookings
    const wallet = await walletService.getBalance(req.user._id);
    if (!wallet || wallet.balance < totalAmount) {
      if (activeHold) {
        activeHold.status = 'released';
        await activeHold.save();
      }
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        data: {
          requiredAmount: totalAmount,
          balance: wallet?.balance || 0,
          shortfall: Math.max(totalAmount - (wallet?.balance || 0), 0),
        },
      });
    }

    const booking = await Booking.create({
      userId: req.user._id,
      floorId: selectedSlot.floorId,
      slotCode: selectedSlot.slotCode,
      licensePlate: plate,
      startTime: start,
      endTime: end,
      paidHours: pricing.paidHours,
      hourlyRate: pricing.hourlyRate,
      prepaidAmount: pricing.prepaidAmount,
      serviceAmount,
      finalAmount: totalAmount,
      ticketPackageId: hourlyPackage ? hourlyPackage._id : null,
      holdId: activeHold?._id || null,
      pricingDetails: {
        ...pricing.pricingDetails,
        serviceAmount,
      },
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
      if (activeHold) {
        activeHold.status = 'released';
        await activeHold.save();
      }
      throw walletError;
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    if (activeHold) {
      activeHold.status = 'consumed';
      await activeHold.save();
    }

    if (services.length > 0) {
      await BookingService.insertMany(
        services.map((service) => ({
          bookingId: booking._id,
          serviceId: service._id,
          serviceName: service.name,
          price: serviceAmount === 0 ? 0 : service.price,
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
    await expireOverdueBookingsForUser(req.app, req.user._id);

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

    if (new Date() > new Date(booking.startTime).getTime() + NO_SHOW_GRACE_MS) {
      booking.status = 'expired';
      await booking.save();
      emitBookingChanged(req.app, booking, { action: 'expired_no_show' });
      return res.status(410).json({
        success: false,
        message: 'Booking expired because arrival was more than 15 minutes late',
      });
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

    const parkingWasWaived = Boolean(booking.pricingDetails?.parkingWaived);
    const actualPricing = buildBookingPricing({
      start: parkingSession.checkInTime,
      end: checkOutTime,
      services: [],
      waiveParkingFee: parkingWasWaived,
    });
    const finalParkingAmount = actualPricing.prepaidAmount;
    const refundAmount = Math.max(booking.prepaidAmount - finalParkingAmount, 0);
    const extraAmount = Math.max(finalParkingAmount - booking.prepaidAmount, 0);

    if (extraAmount > 0) {
      try {
        await walletService.debitWallet(
          booking.userId,
          extraAmount,
          `Booking overstay payment for ${booking.slotCode} - ${booking.licensePlate}`,
          { refSource: 'booking', refSourceId: booking._id }
        );
      } catch (walletError) {
        return res.status(402).json({
          success: false,
          message: 'Wallet balance is insufficient for the extra parking fee. Please pay the extra fee at the Kiosk.',
          data: {
            extraAmount,
            pricing: actualPricing.pricingDetails,
          },
        });
      }
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
      extraAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Booking checked out successfully',
      data: {
        booking,
        session: parkingSession,
        actualHours,
        refundHours: Math.max(booking.paidHours - actualHours, 0),
        refundAmount,
        extraAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only upcoming confirmed bookings can be cancelled' });
    }

    if (new Date() >= booking.startTime) {
      return res.status(400).json({ success: false, message: 'Booking can only be cancelled before check-in time' });
    }

    const refundAmount = Math.max(Number(booking.finalAmount || 0) - Number(booking.refundAmount || 0), 0);

    if (refundAmount > 0) {
      await walletService.creditWallet(
        booking.userId,
        refundAmount,
        'REFUND',
        `Booking cancellation refund for ${booking.slotCode} - ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    }

    booking.status = 'cancelled';
    booking.refundAmount = Number(booking.refundAmount || 0) + refundAmount;
    booking.paymentStatus = refundAmount > 0 ? 'refunded' : booking.paymentStatus;
    await booking.save();

    emitBookingChanged(req.app, booking, {
      action: 'cancelled',
      refundAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled and refunded successfully',
      data: {
        booking,
        refundAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingLicensePlate = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'License plate can only be changed before check-in' });
    }

    if (new Date() >= booking.startTime) {
      return res.status(400).json({ success: false, message: 'License plate can only be changed before check-in time' });
    }

    const plate = await resolveLicensePlate(req.user._id, req.body);
    const vehicleUsageConflict = await findVehicleUsageConflict({
      licensePlate: plate,
      start: booking.startTime,
      end: booking.endTime,
      excludeBookingId: booking._id,
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

    booking.licensePlate = plate;
    await booking.save();

    emitBookingChanged(req.app, booking, {
      action: 'license_plate_updated',
      licensePlate: plate,
    });

    res.status(200).json({
      success: true,
      message: 'License plate updated successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.extendBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!['confirmed', 'active'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only confirmed or active bookings can be extended' });
    }

    const newEnd = new Date(req.body.endTime);
    if (Number.isNaN(newEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid extension end time' });
    }

    const minimumEnd = new Date(Math.max(booking.endTime.getTime(), Date.now()));
    if (newEnd <= minimumEnd) {
      return res.status(400).json({ success: false, message: 'New end time must be later than the current end time' });
    }

    const totalDurationMinutes = (newEnd.getTime() - booking.startTime.getTime()) / 60000;
    if (totalDurationMinutes > MAX_BOOKING_HOURS * 60) {
      return res.status(400).json({ success: false, message: `Maximum booking duration is ${MAX_BOOKING_HOURS} hours` });
    }

    const extensionStart = booking.endTime > new Date() ? booking.endTime : new Date();
    const extensionAvailability = await getAvailableSlotsForRange(extensionStart, newEnd, req.user._id, {
      excludeBookingId: booking._id,
      excludeSessionId: booking.sessionId,
    });

    const sameSlotStillAvailable = extensionAvailability.some((slot) => (
      sameObjectId(slot.floorId, booking.floorId) &&
      normalizeSlotCode(slot.slotCode) === normalizeSlotCode(booking.slotCode)
    ));

    if (!sameSlotStillAvailable) {
      return res.status(409).json({
        success: false,
        message: 'This slot is not available for the requested extension time',
      });
    }

    const parkingWasWaived = Boolean(booking.pricingDetails?.parkingWaived);
    const pricing = buildBookingPricing({
      start: booking.startTime,
      end: newEnd,
      services: [],
      waiveParkingFee: parkingWasWaived,
    });
    const extraAmount = Math.max(pricing.prepaidAmount - booking.prepaidAmount, 0);

    if (extraAmount > 0) {
      await walletService.debitWallet(
        booking.userId,
        extraAmount,
        `Booking extension payment for ${booking.slotCode} - ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    }

    booking.endTime = newEnd;
    booking.paidHours = pricing.paidHours;
    booking.hourlyRate = pricing.hourlyRate;
    booking.prepaidAmount = pricing.prepaidAmount;
    booking.finalAmount = Number(booking.finalAmount || 0) + extraAmount;
    booking.pricingDetails = {
      ...pricing.pricingDetails,
      serviceAmount: booking.serviceAmount,
    };
    booking.paymentStatus = 'paid';
    await booking.save();

    if (booking.sessionId) {
      await Session.findByIdAndUpdate(booking.sessionId, {
        expectedDurationHours: booking.paidHours,
        prepaidAmount: booking.prepaidAmount,
        totalPrice: booking.finalAmount,
      });
    }

    emitBookingChanged(req.app, booking, {
      action: 'extended',
      extraAmount,
      endTime: newEnd,
    });

    res.status(200).json({
      success: true,
      message: extraAmount > 0 ? 'Booking extended and wallet charged successfully' : 'Booking extended successfully',
      data: {
        booking,
        extraAmount,
        pricing,
      },
    });
  } catch (error) {
    next(error);
  }
};
