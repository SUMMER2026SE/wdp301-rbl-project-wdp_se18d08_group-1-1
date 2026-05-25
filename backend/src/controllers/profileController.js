const { validationResult } = require('express-validator');
const User = require('../models/User');
const UserDetail = require('../models/UserDetail');

/**
 * @desc    Get user profile (User + UserDetail)
 * @route   GET /api/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const userDetail = await UserDetail.findOne({ userId: req.user._id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        profile: {
          firstName: userDetail?.firstName || '',
          lastName: userDetail?.lastName || '',
          phone: userDetail?.phone || '',
          dob: userDetail?.dob || null,
          gender: userDetail?.gender || '',
          avatar: userDetail?.avatar || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, dob, gender, avatar } = req.body;

    // Update or create UserDetail
    const userDetail = await UserDetail.findOneAndUpdate(
      { userId: req.user._id },
      {
        firstName,
        lastName,
        phone,
        dob,
        gender,
        avatar,
      },
      {
        new: true,          // Return updated document
        upsert: true,       // Create if not exists
        runValidators: true, // Run schema validators
      }
    );

    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: {
          firstName: userDetail.firstName,
          lastName: userDetail.lastName,
          phone: userDetail.phone,
          dob: userDetail.dob,
          gender: userDetail.gender,
          avatar: userDetail.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/profile/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Check new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
