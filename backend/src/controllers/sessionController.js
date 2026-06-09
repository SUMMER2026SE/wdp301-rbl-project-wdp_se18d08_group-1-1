const Session = require('../models/Session');
const UserDetail = require('../models/UserDetail');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { sendKioskCheckInEmail, sendCheckoutEmail } = require('../utils/emailUtils');
const notifTriggers = require('../services/notificationTriggers');
const { LOW_BALANCE_THRESHOLD } = require('../services/parkingScheduler');

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

    // Check if there is already an active session for this plate
    const activeSession = await Session.findOne({ licensePlate, status: 'active' });
    if (activeSession) {
      return res.status(200).json({
        success: true,
        data: { isActive: true, phone: activeSession.phone }
      });
    }

    // Check for registered vehicle
    const Vehicle = require('../models/Vehicle');
    const UserDetail = require('../models/UserDetail');

    const registeredVehicle = await Vehicle.findOne({ 
      licensePlate: { $regex: new RegExp(`^${licensePlate}$`, 'i') }, 
      status: 'approved' 
    });

    let isVIP = false;
    let phone = null;

    if (registeredVehicle) {
       isVIP = true;
       const userDetail = await UserDetail.findOne({ userId: registeredVehicle.owner });
       if (userDetail) {
          phone = userDetail.phone;
       }
    }

    // Look for past sessions to auto-fill phone number
    const pastSession = await Session.findOne({ licensePlate, phone: { $ne: null } }).sort({ checkInTime: -1 });
    if (!phone && pastSession) {
      phone = pastSession.phone;
    }

    // Placeholder: Check for monthly pass or pre-booking (Fastpass)
    const isMonthly = false;
    const hasPreBooking = false;

    return res.status(200).json({
      success: true,
      data: {
        isActive: false,
        isMonthly,
        hasPreBooking,
        isVIP,
        phone: phone,
        isKnownGuest: !!phone || isVIP
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
    const { licensePlate, phone, vehicleType, parkingSlot, floorId, durationHours, entryImageBase64 } = req.body;

    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    // TÌM XEM XE CÓ ĐANG Ở TRONG BÃI KHÔNG (Phòng trường hợp xe bám đuôi đi ra, giờ quay lại)
    const existingSession = await Session.findOne({ licensePlate, status: 'active' });
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

    // Auto-link session if the phone number belongs to a registered user
    let userId = null;
    let userEmail = null;
    console.log('--- KIOSK CHECK-IN DEBUG ---');
    console.log('Received phone:', phone);

    if (phone) {
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

    // Create session in database
    const newSession = await Session.create({
      licensePlate,
      userId,
      phone: phone || null,
      vehicleType: vehicleType || 'car',
      parkingSlot: parkingSlot || null,
      floorId: floorId || null,
      expectedDurationHours: durationHours ? Number(durationHours) : 1,
      entryImage_url,
      checkInTime: new Date(),
      status: 'active',
    });

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
        req.app, userId, licensePlate, parkingSlot || 'N/A'
      ).catch(err => console.error('Failed to send entry notification:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Kiosk session created successfully',
      data: newSession,
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

    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    const session = await Session.findOne({ licensePlate, status: 'active' }).populate('userId');
    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found for this license plate' });
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime - session.checkInTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)) || 1; // At least 1 hour

    // Calculate Price
    const expectedHours = session.expectedDurationHours || 1;
    let basePrice = expectedHours * 10000;
    let overtimePrice = 0;

    if (durationHours > expectedHours) {
      const overtimeHours = durationHours - expectedHours;
      overtimePrice = overtimeHours * 13000; // 30% penalty (10k * 1.3)
    } else {
      basePrice = durationHours * 10000;
    }

    const totalPrice = basePrice + overtimePrice;

    // Check Wallet if user exists
    let walletBalance = 0;
    let canAutoPay = false;
    if (session.userId) {
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

    const session = await Session.findById(sessionId);
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
    let basePrice = durationHours > expectedHours ? expectedHours * 10000 : durationHours * 10000;
    let overtimePrice = durationHours > expectedHours ? (durationHours - expectedHours) * 13000 : 0;
    const totalPrice = basePrice + overtimePrice;

    if (paymentMethod === 'wallet') {
      if (!session.userId) {
        return res.status(400).json({ success: false, message: 'Guest cannot pay via wallet' });
      }
      const { debitWallet } = require('../services/walletService');
      await debitWallet(session.userId, totalPrice, `Thanh toán Kiosk - Biển số ${session.licensePlate}`, { allowNegative: true });
    }

    session.status = 'completed';
    session.checkOutTime = checkOutTime;
    session.totalPrice = totalPrice;
    if (exitImage_url) {
      session.exitImage_url = exitImage_url;
    }

    await session.save();

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
            totalPrice: session.totalPrice.toLocaleString('vi-VN') + ' VND'
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

      if (paymentMethod === 'wallet') {
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
