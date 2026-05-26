const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  googleLogin,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  registerValidator,
  loginValidator,
  sendOTPValidator,
  verifyOTPValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh-token', refreshAccessToken);
router.post('/google', googleLogin);
router.post('/send-otp', sendOTPValidator, sendOTP);
router.post('/verify-otp', verifyOTPValidator, verifyOTP);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
