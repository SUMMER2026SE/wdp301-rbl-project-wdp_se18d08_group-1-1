const Session = require('../models/Session');
const UserDetail = require('../models/UserDetail');
const cloudinary = require('../config/cloudinary');

/**
 * Create a new parking session from Kiosk
 * POST /api/sessions/kiosk-entry
 */
exports.createKioskSession = async (req, res, next) => {
  try {
    const { licensePlate, phone, vehicleType, parkingSlot, durationHours, entryImageBase64 } = req.body;

    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
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
    if (phone) {
      const userDetail = await UserDetail.findOne({ phone });
      if (userDetail) {
        userId = userDetail.userId;
      }
    }

    // Create session in database
    const newSession = await Session.create({
      licensePlate,
      userId,
      phone: phone || null,
      vehicleType: vehicleType || 'car',
      parkingSlot: parkingSlot || null,
      expectedDurationHours: durationHours ? Number(durationHours) : 1,
      entryImage_url,
      checkInTime: new Date(),
      status: 'active',
    });

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
