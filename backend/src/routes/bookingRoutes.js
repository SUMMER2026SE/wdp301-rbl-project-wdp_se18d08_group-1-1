const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize, softProtect } = require('../middlewares/authMiddleware');

// Route public dành cho webhook PayOS thanh toán đặt chỗ
router.post('/webhook', bookingController.handleBookingWebhook);

// Gợi ý ô đỗ thông minh
router.get('/suggest-slot', bookingController.suggestSmartSlot);

// Khóa ô đỗ tạm thời (Guest & User)
router.post('/hold', softProtect, bookingController.createBookingHold);

// Các route yêu cầu khách hàng đã đăng nhập
router.use(protect);
router.use(authorize('customer', 'admin'));

router.post('/', bookingController.createBooking);
router.get('/my-history', bookingController.getMyBookings);
router.get('/status/:orderCode', bookingController.checkVietQRStatus);
router.post('/:id/cancel', bookingController.cancelBooking);
router.put('/:id/time', bookingController.modifyBookingTime);
router.put('/:id/vehicle', bookingController.updateBookingVehicle);

module.exports = router;
