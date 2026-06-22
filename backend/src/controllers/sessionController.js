const Session = require('../models/Session');
const UserDetail = require('../models/UserDetail');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { sendKioskCheckInEmail, sendCheckoutEmail } = require('../utils/emailUtils');
const notifTriggers = require('../services/notificationTriggers');
const { LOW_BALANCE_THRESHOLD } = require('../services/parkingScheduler');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');
const { resolveKioskPricingPackage } = require('../utils/kioskPricing');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');
const Slot = require('../models/Slot');
const { emitToUser } = require('../sockets/notificationSocket');

const BOOKING_EARLY_CHECKIN_MINUTES = 30;
const BOOKING_LATE_GRACE_MINUTES = 15;

const findEligiblePreBooking = async (normalizedPlate) => {
  const now = new Date();
  const earliestAllowedStart = new Date(now.getTime() - BOOKING_LATE_GRACE_MINUTES * 60 * 1000);
  const latestAllowedStart = new Date(now.getTime() + BOOKING_EARLY_CHECKIN_MINUTES * 60 * 1000);

  return Booking.findOne({
    licensePlate: normalizedPlate,
    status: 'confirmed',
    startTime: { $gte: earliestAllowedStart, $lte: latestAllowedStart },
    endTime: { $gt: now },
  })
    .populate('floorId', 'name floorNumber')
    .populate('ticketPackageId', 'name type price')
    .sort({ startTime: 1 });
};

const syncBookingStatusFromSession = async (session, overrides = {}) => {
  if (!session?._id) return null;

  const booking = await Booking.findOne({ sessionId: session._id });
  if (!booking) return null;

  if (overrides.status) {
    booking.status = overrides.status;
  }
  if (typeof overrides.finalAmount === 'number') {
    booking.finalAmount = overrides.finalAmount;
  }
  if (typeof overrides.refundAmount === 'number') {
    booking.refundAmount = overrides.refundAmount;
  }
  if (overrides.paymentStatus) {
    booking.paymentStatus = overrides.paymentStatus;
  }

  await booking.save();
  return booking;
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

const hasActiveVipMembership = (user) => {
  if (!user?.membership?.isVip || !user?.membership?.packageId || !user?.membership?.expireAt) {
    return false;
  }

  const expireAt = new Date(user.membership.expireAt);
  return !Number.isNaN(expireAt.getTime()) && expireAt > new Date();
};

const resolveActiveSubscriptionAccess = async (userId) => {
  if (!userId) {
    return {
      isSubscriptionActive: false,
      membershipType: null,
      assignedSlot: null,
      assignedFloorId: null,
      assignedFloorName: null,
      ticketPackageId: null,
    };
  }

  const now = new Date();
  const subscription = await Subscription.findOne({
    user: userId,
    status: 'active',
    paymentStatus: 'paid',
    expireAt: { $gt: now },
  })
    .populate('ticketPackage', 'name type price')
    .populate('slots.floorId', 'name floorNumber')
    .sort({ expireAt: -1, createdAt: -1 });

  const membershipType = subscription?.ticketPackage?.type || null;
  const isSubscriptionActive = ['monthly', 'yearly'].includes(membershipType);

  let assignedSlot = subscription?.slots?.[0] || null;
  let assignedFloorId = assignedSlot?.floorId?._id || assignedSlot?.floorId || null;
  let assignedFloorName = assignedSlot?.floorId?.name || null;

  if (!assignedSlot) {
    const reservedSlot = await Slot.findOne({ reservedFor: userId })
      .populate('floorID', 'name floorNumber')
      .sort({ updatedAt: -1, createdAt: -1 });

    if (reservedSlot) {
      assignedSlot = reservedSlot;
      assignedFloorId = reservedSlot.floorID?._id || reservedSlot.floorID || null;
      assignedFloorName = reservedSlot.floorID?.name || null;
    }
  }

  return {
    isSubscriptionActive,
    membershipType,
    assignedSlot: subscription?.slots?.[0]?.slotCode || assignedSlot?.slotCode || assignedSlot?.slotNumber || null,
    assignedFloorId,
    assignedFloorName,
    ticketPackageId: subscription?.ticketPackage?._id || null,
  };
};

const resolveCheckoutBilling = async (session) => {
  const linkedBooking = await Booking.findOne({ sessionId: session._id }).select(
    'finalAmount refundAmount paymentStatus'
  );

  if (linkedBooking) {
    return {
      waiveCharge: true,
      reason: 'booking',
      chargeAtExit: 0,
      recordedSessionTotal: Number(linkedBooking.finalAmount || 0),
      linkedBooking,
    };
  }

  if (['monthly', 'yearly'].includes(session.ticketPackageId?.type)) {
    return {
      waiveCharge: true,
      reason: 'membership',
      chargeAtExit: 0,
      recordedSessionTotal: 0,
      linkedBooking: null,
    };
  }

  const resolvedUser = session.userId?._id
    ? session.userId
    : session.userId
      ? await User.findById(session.userId).select('membership email')
      : null;

  if (hasActiveVipMembership(resolvedUser)) {
    return {
      waiveCharge: true,
      reason: 'membership',
      chargeAtExit: 0,
      recordedSessionTotal: 0,
      linkedBooking: null,
    };
  }

  return {
    waiveCharge: false,
    reason: 'kiosk',
    chargeAtExit: null,
    recordedSessionTotal: null,
    linkedBooking: null,
  };
};

/**
 * Verify license plate to auto-fill phone or skip steps
 * POST /api/sessions/verify-plate
 */
exports.verifyPlate = async (req, res, next) => {
  try {
    const { licensePlate } = req.body;
    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    // Check if there is already an active session for this plate
    const activeSession = await Session.findOne({ licensePlate: normalizedPlate, status: 'active' });
    if (activeSession) {
      return res.status(200).json({
        success: true,
        data: { isActive: true, phone: activeSession.phone }
      });
    }

    // Check for registered vehicle
    const Vehicle = require('../models/Vehicle');

    const registeredVehicle = await Vehicle.findOne({ 
      licensePlate: normalizedPlate,
      status: 'approved' 
    });

    let isVIP = false;
    let isRegisteredVehicle = false;
    let phone = null;
    let registeredUser = null;

    if (registeredVehicle) {
       isRegisteredVehicle = true;
       const userDetail = await UserDetail.findOne({ userId: registeredVehicle.owner });
       if (userDetail) {
          phone = userDetail.phone;
       }
       
       registeredUser = await User.findById(registeredVehicle.owner);
       if (registeredUser && registeredUser.membership && registeredUser.membership.isVip && new Date(registeredUser.membership.expireAt) > new Date()) {
           isVIP = true;
       }
    }

    const membershipAccess = await resolveActiveSubscriptionAccess(registeredVehicle?.owner || null);

    const pricing = await resolveKioskPricingPackage({
      userId: registeredVehicle?.owner || null,
      phone: phone || '',
      licensePlate: normalizedPlate,
    });

    // Look for past sessions to auto-fill phone number
    const pastSession = await Session.findOne({ licensePlate: normalizedPlate, phone: { $ne: null } }).sort({ checkInTime: -1 });
    if (!phone && pastSession) {
      phone = pastSession.phone;
    }

    const preBooking = await findEligiblePreBooking(normalizedPlate);
    const isMonthly = membershipAccess.isSubscriptionActive;
    const hasPreBooking = !!preBooking;

    return res.status(200).json({
      success: true,
      data: {
        isActive: false,
        isMonthly,
        hasPreBooking,
        isVIP,
        isRegisteredVehicle,
        membershipType: membershipAccess.membershipType,
        phone: phone,
        isKnownGuest: !!phone || isVIP || isRegisteredVehicle,
        bookingId: preBooking?._id || null,
        assignedSlot: preBooking?.slotCode || membershipAccess.assignedSlot || null,
        assignedFloorId: preBooking?.floorId?._id || membershipAccess.assignedFloorId || null,
        assignedFloorName: preBooking?.floorId?.name || membershipAccess.assignedFloorName || null,
        bookingStartTime: preBooking?.startTime || null,
        bookingEndTime: preBooking?.endTime || null,
        bookingDurationHours:
          preBooking?.paidHours || (membershipAccess.isSubscriptionActive ? 24 : null),
        bookingTicketPackageId:
          preBooking?.ticketPackageId?._id || membershipAccess.ticketPackageId || null,
        bookingMode:
          preBooking?.ticketPackageId?.type === 'daily'
            ? 'daily'
            : membershipAccess.isSubscriptionActive
              ? 'daily'
              : 'hourly',
        pricingPackage: pricing.package,
        pricingSource: pricing.source,
      }
    });

  } catch (error) {
    console.error('verifyPlate error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Create a new parking session from Kiosk
 * POST /api/sessions/kiosk-entry
 */
exports.createKioskSession = async (req, res, next) => {
  try {
    const { licensePlate, phone, vehicleType, parkingSlot, floorId, durationHours, entryImageBase64, bookingId } = req.body;
    const normalizedPlate = normalizeLicensePlate(licensePlate);

    if (!normalizedPlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    // TÌM XEM XE CÓ ĐANG Ở TRONG BÃI KHÔNG (Phòng trường hợp xe bám đuôi đi ra, giờ quay lại)
    const existingSession = await Session.findOne({ licensePlate: normalizedPlate, status: 'active' });
    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is currently recorded as being in the parking lot. Please contact security to resolve system error.'
      });
    }

    let entryImage_url = null;

    // If an image was captured, upload to Cloudinary
    if (entryImageBase64) {
      try {
        // Cloudinary can accept base64 strings directly
        const result = await cloudinary.uploader.upload(entryImageBase64, {
          folder: 'valo_parking/sessions/entry',
        });
        entryImage_url = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        // Continue creating session even if image upload fails, or we could return error
      }
    }

    let preBooking = null;
    if (bookingId) {
      preBooking = await Booking.findOne({
        _id: bookingId,
        licensePlate: normalizedPlate,
        status: 'confirmed',
      }).populate('ticketPackageId', 'name type price');

      if (!preBooking) {
        return res.status(404).json({
          success: false,
          message: 'Pre-booking not found or is no longer valid.',
        });
      }

      const now = new Date();
      const earliestAllowedStart = new Date(now.getTime() - BOOKING_LATE_GRACE_MINUTES * 60 * 1000);
      const latestAllowedStart = new Date(now.getTime() + BOOKING_EARLY_CHECKIN_MINUTES * 60 * 1000);

      if (preBooking.endTime <= now || preBooking.startTime < earliestAllowedStart || preBooking.startTime > latestAllowedStart) {
        return res.status(400).json({
          success: false,
          message: 'This booking is outside the kiosk check-in window.',
        });
      }

      const existingSlotSession = await Session.findOne({
        floorId: preBooking.floorId,
        parkingSlot: preBooking.slotCode,
        status: 'active',
      });

      if (existingSlotSession) {
        return res.status(409).json({
          success: false,
          message: 'This booked slot is currently occupied.',
        });
      }
    }

    // Auto-link session if the phone number belongs to a registered user
    let userId = null;
    let userEmail = null;
    console.log('--- KIOSK CHECK-IN DEBUG ---');
    console.log('Received phone:', phone);

    if (preBooking?.userId) {
      userId = preBooking.userId;
      const bookingUser = await User.findById(userId);
      if (bookingUser) {
        userEmail = bookingUser.email;
      }
    }

    if (!userId && phone) {
      // Fetch ALL UserDetails with this phone, sorted by newest first
      const userDetails = await UserDetail.find({ phone }).sort({ createdAt: -1 });
      console.log(`Found ${userDetails.length} UserDetail(s) for this phone.`);

      for (const detail of userDetails) {
        const user = await User.findById(detail.userId);
        if (user) {
          userId = user._id;
          userEmail = user.email;
          console.log(`Successfully matched with valid User: ${user.email} (ID: ${user._id})`);
          break; // Stop at the first VALID user we find
        } else {
          console.log(`Orphaned UserDetail found for ID: ${detail.userId} (No matching User)`);
        }
      }
    }

    if (!userId) {
      const registeredVehicle = await require('../models/Vehicle').findOne({
        licensePlate: normalizedPlate,
        status: 'approved',
      });
      if (registeredVehicle) {
        userId = registeredVehicle.owner;
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email;
        }
      }
    }

    const pricing = preBooking
      ? {
          package: preBooking.ticketPackageId || null,
          source: 'booking',
        }
      : await resolveKioskPricingPackage({
          userId,
          phone: phone || '',
          licensePlate: normalizedPlate,
        });

    // Create session in database
    const newSession = await Session.create({
      licensePlate: normalizedPlate,
      userId,
      phone: phone || null,
      vehicleType: vehicleType || 'car',
      parkingSlot: preBooking?.slotCode || parkingSlot || null,
      floorId: preBooking?.floorId || floorId || null,
      expectedDurationHours: preBooking?.paidHours || (durationHours ? Number(durationHours) : 1),
      ticketPackageId: pricing.package?._id || null,
      entryImage_url,
      checkInTime: new Date(),
      status: 'active',
    });

    if (preBooking) {
      preBooking.status = 'active';
      preBooking.sessionId = newSession._id;
      await preBooking.save();
      emitBookingChanged(req.app, preBooking, { action: 'kiosk_checked_in' });
    }

    // Send check-in notification email if user has a registered email
    console.log('Will send check-in email?', userEmail ? 'YES (' + userEmail + ')' : 'NO');
    if (userEmail) {
      // Format time for email
      const formattedTime = new Date(newSession.checkInTime).toLocaleString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // Calculate expected checkout time
      const expectedCheckoutDate = new Date(newSession.checkInTime);
      expectedCheckoutDate.setHours(expectedCheckoutDate.getHours() + newSession.expectedDurationHours);
      const formattedCheckoutTime = expectedCheckoutDate.toLocaleString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      console.log('Sending email...');
      sendKioskCheckInEmail(userEmail, {
        sessionId: newSession._id.toString().slice(-6).toUpperCase(),
        checkInTime: formattedTime,
        expectedCheckoutTime: formattedCheckoutTime,
        duration: newSession.expectedDurationHours,
        parkingSlot: newSession.parkingSlot || 'Assigned by Kiosk',
        licensePlate: newSession.licensePlate,
        vehicleType: newSession.vehicleType
      }).then(() => console.log('Email sent successfully!'))
        .catch(err => console.error('Failed to send Kiosk check-in email:', err));
    }

    // Fire-and-forget: send vehicle entry notification
    if (userId) {
      notifTriggers.notifyVehicleEntry(
        req.app, userId, normalizedPlate, parkingSlot || 'N/A'
      ).catch(err => console.error('Failed to send entry notification:', err));
    }

    res.status(201).json({
      success: true,
      message: preBooking ? 'Pre-booking checked in successfully' : 'Kiosk session created successfully',
      data: {
        ...newSession.toObject(),
        bookingId: preBooking?._id || null,
        preBooked: !!preBooking,
      },
    });
  } catch (error) {
    console.error('Error creating kiosk session:', error);
    next(error);
  }
};

/**
 * Get all sessions for Staff/Manager
 * GET /api/sessions
 */
exports.getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ checkInTime: -1 });
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    next(error);
  }
};

/**
 * Get all sessions for the currently logged in customer
 * GET /api/sessions/my-history
 */
exports.getMyHistory = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ checkInTime: -1 });
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting my history:', error);
    next(error);
  }
};

/**
 * Kiosk Exit Scan
 * POST /api/sessions/kiosk-exit-scan
 */
exports.kioskExitScan = async (req, res, next) => {
  try {
    const { licensePlate } = req.body;
    const normalizedPlate = normalizeLicensePlate(licensePlate);

    if (!normalizedPlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    const session = await Session.findOne({ licensePlate: normalizedPlate, status: 'active' })
      .populate('userId')
      .populate('ticketPackageId');
    if (!session) {
      const activeBooking = await Booking.findOne({
        licensePlate: normalizedPlate,
        status: 'active',
      }).sort({ updatedAt: -1 });

      if (activeBooking?.sessionId) {
        const linkedSession = await Session.findById(activeBooking.sessionId).select(
          'status checkOutTime totalPrice'
        );

        if (linkedSession?.status === 'completed') {
          const repairedBooking = await syncBookingStatusFromSession(linkedSession, {
            status: 'completed',
            finalAmount:
              typeof linkedSession.totalPrice === 'number'
                ? linkedSession.totalPrice
                : activeBooking.finalAmount,
            refundAmount: activeBooking.refundAmount || 0,
            paymentStatus:
              activeBooking.paymentStatus === 'failed' ? 'paid' : activeBooking.paymentStatus,
          });
          emitBookingChanged(req.app, repairedBooking, { action: 'status_repaired' });

          return res.status(409).json({
            success: false,
            message: 'This vehicle has already been checked out of the parking lot.',
            alarm: true,
            alarmReason: 'already_checked_out',
          });
        }
      }

      return res.status(404).json({
        success: false,
        message: 'No active session found for this license plate',
        alarm: true,
        alarmReason: 'no_active_checkin',
      });
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime - session.checkInTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)) || 1; // At least 1 hour

    // Calculate Price
    const expectedHours = session.expectedDurationHours || 1;
    let basePrice = 0;
    let overtimePrice = 0;

    const packageRate = session.ticketPackageId?.price || 10000;
    const isDaily = session.ticketPackageId?.type === 'daily';

    if (isDaily) {
      // Daily package: Charge fixed price for the first 24h. Overstay adds hourly rate.
      const expectedDays = Math.ceil(expectedHours / 24);
      basePrice = expectedDays * packageRate;

      if (durationHours > expectedDays * 24) {
        const overtimeHours = durationHours - expectedDays * 24;
        overtimePrice = overtimeHours * (packageRate / 24 * 1.3); // 30% penalty of hourly equivalent
      }
    } else {
      // Hourly package
      if (durationHours > expectedHours) {
        const overtimeHours = durationHours - expectedHours;
        overtimePrice = overtimeHours * (packageRate * 1.3); // 30% penalty
        basePrice = expectedHours * packageRate;
      } else {
        basePrice = durationHours * packageRate;
      }
    }

    const computedTotalPrice = basePrice + overtimePrice;
    const billing = await resolveCheckoutBilling(session);
    const totalPrice = billing.waiveCharge ? 0 : computedTotalPrice;

    // Check Wallet if user exists
    let walletBalance = 0;
    let canAutoPay = false;
    if (totalPrice === 0) {
      canAutoPay = true;
    } else if (session.userId) {
      const { getBalance } = require('../services/walletService');
      const walletData = await getBalance(session.userId._id);
      walletBalance = walletData.balance;
      // Allow up to -100k debt
      if (walletBalance - totalPrice >= -100000) {
        canAutoPay = true;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        session,
        checkOutTime,
        durationHours,
        expectedHours,
        totalPrice,
        walletBalance,
        canAutoPay,
        chargeRequired: totalPrice > 0,
        billingReason: billing.reason,
      }
    });

  } catch (error) {
    console.error('Error in kioskExitScan:', error);
    next(error);
  }
};

/**
 * Kiosk Checkout processing
 * POST /api/sessions/kiosk-checkout
 */
exports.kioskCheckout = async (req, res, next) => {
  try {
    const { sessionId, exitImageBase64, paymentMethod } = req.body;

    const session = await Session.findById(sessionId)
      .populate('ticketPackageId')
      .populate('userId', 'email membership');
    if (!session || session.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }

    let exitImage_url = null;
    if (exitImageBase64) {
      const cloudinary = require('../config/cloudinary');
      try {
        const result = await cloudinary.uploader.upload(exitImageBase64, {
          folder: 'valo_parking/sessions/exit',
        });
        exitImage_url = result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error on exit:', err);
      }
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime - session.checkInTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)) || 1;

    const expectedHours = session.expectedDurationHours || 1;
    let basePrice = 0;
    let overtimePrice = 0;

    const packageRate = session.ticketPackageId?.price || 10000;
    const isDaily = session.ticketPackageId?.type === 'daily';

    if (isDaily) {
      const expectedDays = Math.ceil(expectedHours / 24);
      basePrice = expectedDays * packageRate;

      if (durationHours > expectedDays * 24) {
        const overtimeHours = durationHours - expectedDays * 24;
        overtimePrice = overtimeHours * (packageRate / 24 * 1.3);
      }
    } else {
      if (durationHours > expectedHours) {
        overtimePrice = (durationHours - expectedHours) * (packageRate * 1.3);
        basePrice = expectedHours * packageRate;
      } else {
        basePrice = durationHours * packageRate;
      }
    }

    const computedTotalPrice = basePrice + overtimePrice;
    const billing = await resolveCheckoutBilling(session);
    const totalPrice = billing.waiveCharge ? 0 : computedTotalPrice;

    if (paymentMethod === 'wallet' && totalPrice > 0) {
      if (!session.userId) {
        return res.status(400).json({ success: false, message: 'Guest cannot pay via wallet' });
      }
      const { debitWallet } = require('../services/walletService');
      await debitWallet(
        session.userId,
        totalPrice,
        `Kiosk payment - Plate ${session.licensePlate}`,
        { allowNegative: true, refSource: 'parking', refSourceId: session._id }
      );
    }

    session.status = 'completed';
    session.checkOutTime = checkOutTime;
    session.totalPrice =
      typeof billing.recordedSessionTotal === 'number' ? billing.recordedSessionTotal : totalPrice;
    if (exitImage_url) {
      session.exitImage_url = exitImage_url;
    }

    await session.save();

    const syncedBooking = await syncBookingStatusFromSession(session, {
      status: 'completed',
      finalAmount:
        typeof billing.recordedSessionTotal === 'number' ? billing.recordedSessionTotal : totalPrice,
      refundAmount: billing.linkedBooking?.refundAmount || 0,
      paymentStatus: billing.linkedBooking?.paymentStatus || 'paid',
    });
    emitBookingChanged(req.app, syncedBooking, { action: 'kiosk_checked_out' });

    // Send checkout email if linked to user
    if (session.userId) {
      try {
        const user = await User.findById(session.userId);
        if (user && user.email) {
          const formattedCheckIn = new Date(session.checkInTime).toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short'
          });
          const formattedCheckOut = new Date(session.checkOutTime).toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short'
          });

          sendCheckoutEmail(user.email, {
            sessionId: session._id.toString().slice(-6).toUpperCase(),
            checkInTime: formattedCheckIn,
            checkOutTime: formattedCheckOut,
            duration: `${durationHours} hr(s)`,
            parkingSlot: session.parkingSlot || 'Assigned by Kiosk',
            licensePlate: session.licensePlate,
            vehicleType: session.vehicleType,
            totalPrice: Number(session.totalPrice || 0).toLocaleString('vi-VN') + ' VND'
          }).catch(err => console.error('Failed to send Checkout email:', err));
        }
      } catch (err) {
        console.error('Error fetching user for checkout email:', err);
      }

      // Fire-and-forget: send vehicle exit + payment notifications
      const uid = session.userId._id || session.userId;
      notifTriggers.notifyVehicleExit(
        req.app, uid, session.licensePlate, totalPrice
      ).catch(err => console.error('Failed to send exit notification:', err));

      if (paymentMethod === 'wallet' && totalPrice > 0) {
        notifTriggers.notifyPaymentSuccess(
          req.app, uid, totalPrice, session._id.toString()
        ).catch(err => console.error('Failed to send payment notification:', err));

        // Check low balance after payment
        try {
          const { getBalance } = require('../services/walletService');
          const walletData = await getBalance(uid);
          if (walletData.balance < LOW_BALANCE_THRESHOLD) {
            notifTriggers.notifyLowBalance(
              req.app, uid, walletData.balance
            ).catch(err => console.error('Failed to send low balance notification:', err));
          }
        } catch (balErr) {
          console.error('Error checking balance after payment:', balErr);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Checkout completed',
      data: session
    });

  } catch (error) {
    console.error('Error in kioskCheckout:', error);
    next(error);
  }
};

/**
 * Get active parking status
 * GET /api/sessions/active-status
 * Returns list of active sessions with floorId and parkingSlot
 */
exports.getActiveParkingStatus = async (req, res, next) => {
  try {
    const activeSessions = await Session.find({ status: 'active', parkingSlot: { $ne: null } })
      .select('licensePlate parkingSlot floorId vehicleType checkInTime expectedDurationHours phone userId')
      .populate('userId', 'email username');

    res.status(200).json({
      success: true,
      data: activeSessions,
    });
  } catch (error) {
    console.error('Error getting active parking status:', error);
    next(error);
  }
};
