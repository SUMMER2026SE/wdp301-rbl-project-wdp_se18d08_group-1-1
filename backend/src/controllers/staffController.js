const User = require('../models/User');
const UserDetail = require('../models/UserDetail');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const StaffBookingAction = require('../models/StaffBookingAction');
const bookingController = require('./bookingController');
const {
  getAllowedStaffActions,
  isBookingQrAvailable,
  parseAndVerifyBookingQr,
} = require('../services/bookingQrService');

const EVIDENCE_IMAGE_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;

const validateStaffTransitionBody = (body = {}) => {
  const action = String(body.action || '').toUpperCase();
  const reason = String(body.reason || '').trim();
  const idempotencyKey = String(body.idempotencyKey || '').trim();
  const evidenceImageBase64 = body.evidenceImageBase64;

  if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
    return { error: 'Action must be CHECK_IN or CHECK_OUT' };
  }
  if (!reason || reason.length > 500) {
    return { error: 'A reason of at most 500 characters is required' };
  }
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return { error: 'A valid idempotency key is required' };
  }
  if (
    typeof evidenceImageBase64 !== 'string' ||
    evidenceImageBase64.length > 20 * 1024 * 1024 ||
    !EVIDENCE_IMAGE_PATTERN.test(evidenceImageBase64)
  ) {
    return { error: 'A JPEG, PNG, or WebP evidence image is required' };
  }

  return { action, reason, idempotencyKey, evidenceImageBase64 };
};

exports.resolveBookingQr = async (req, res, next) => {
  try {
    const parsed = parseAndVerifyBookingQr(req.body?.payload);
    const booking = await Booking.findById(parsed.bookingId)
      .populate('userId', 'username email')
      .populate('vehicleId', 'licensePlate brand model color')
      .populate('floorId', 'name floorNumber');

    if (!booking || Number(booking.qrVersion || 1) !== parsed.version) {
      return res.status(404).json({ success: false, message: 'Booking QR not found' });
    }
    if (!isBookingQrAvailable(booking)) {
      return res.status(410).json({
        success: false,
        code: 'BOOKING_QR_INACTIVE',
        message: 'This booking has ended and its QR code is no longer valid',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        booking,
        allowedActions: getAllowedStaffActions(booking),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.transitionBookingByQr = async (req, res, next) => {
  try {
    const input = validateStaffTransitionBody(req.body);
    if (input.error) {
      return res.status(400).json({ success: false, message: input.error });
    }

    const parsed = parseAndVerifyBookingQr(req.body?.payload);
    if (String(parsed.bookingId) !== String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'QR code does not match this booking' });
    }

    const existingAction = await StaffBookingAction.findOne({
      staffId: req.user._id,
      idempotencyKey: input.idempotencyKey,
    });
    if (existingAction) {
      if (
        String(existingAction.bookingId) !== String(parsed.bookingId) ||
        existingAction.action !== input.action
      ) {
        return res.status(409).json({
          success: false,
          message: 'Idempotency key was already used for another staff action',
        });
      }
      const [booking, session] = await Promise.all([
        Booking.findById(existingAction.bookingId),
        existingAction.sessionId ? Session.findById(existingAction.sessionId) : null,
      ]);
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Staff booking action was already completed',
        data: { booking, session },
      });
    }

    const booking = await Booking.findById(parsed.bookingId);
    if (!booking || Number(booking.qrVersion || 1) !== parsed.version) {
      return res.status(404).json({ success: false, message: 'Booking QR not found' });
    }
    if (!isBookingQrAvailable(booking)) {
      return res.status(410).json({
        success: false,
        code: 'BOOKING_QR_INACTIVE',
        message: 'This booking has ended and its QR code is no longer valid',
      });
    }
    if (!getAllowedStaffActions(booking).includes(input.action)) {
      return res.status(409).json({
        success: false,
        message: `${input.action} is not allowed while booking is ${booking.status}`,
      });
    }

    req.staffBookingAction = input;
    if (input.action === 'CHECK_IN') {
      return bookingController.checkInBooking(req, res, next);
    }
    return bookingController.checkOutBooking(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  List all customer users with their profiles
 * @route GET /api/staff/users
 * @access Staff only
 */
exports.listCustomers = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      { $match: { role: 'customer' } },
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
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    res.status(200).json({ success: true, data: users });
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ success: true, data: user });
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
    const { firstName, lastName, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    let userDetail = await UserDetail.findOne({ userId: user._id });
    if (!userDetail) {
      userDetail = new UserDetail({ userId: user._id });
    }

    if (firstName !== undefined) userDetail.firstName = firstName;
    if (lastName !== undefined) userDetail.lastName = lastName;
    if (phone !== undefined) userDetail.phone = phone;
    await userDetail.save();

    const updatedUser = await User.aggregate([
      { $match: { _id: user._id } },
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
    ]);

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (err) {
    next(err);
  }
};
