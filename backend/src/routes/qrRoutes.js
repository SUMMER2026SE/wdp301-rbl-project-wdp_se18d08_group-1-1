const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Route xác thực QR tại Kiosk (public hoặc có api_key bảo mật tùy thiết kế)
router.post('/verify', qrController.verifyQrToken);

// Route tạo QR của khách hàng
router.post('/generate', protect, authorize('customer', 'admin'), qrController.generateQrToken);

module.exports = router;
