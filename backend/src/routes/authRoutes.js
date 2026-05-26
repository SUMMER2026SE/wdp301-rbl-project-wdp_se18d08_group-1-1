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
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  registerValidator,
  loginValidator,
  sendOTPValidator,
  verifyOTPValidator,
} = require('../validators/authValidator');

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh-token', refreshAccessToken);
router.post('/google', googleLogin);
router.post('/send-otp', sendOTPValidator, sendOTP);
router.post('/verify-otp', verifyOTPValidator, verifyOTP);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
