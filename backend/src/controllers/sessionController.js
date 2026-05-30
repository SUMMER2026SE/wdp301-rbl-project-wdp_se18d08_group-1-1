const Session = require('../models/Session');
const UserDetail = require('../models/UserDetail');
const cloudinary = require('../config/cloudinary');

/**
 * Create a new parking session from Kiosk
 * POST /api/sessions/kiosk-entry
 */
exports.createKioskSession = async (req, res, next) => {
  try {
    const { licensePlate, phone, vehicleType, parkingSlot, entryImageBase64 } = req.body;

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
