const express = require('express');
const {
  getAvailableSlots,
  createBooking,
  getMyBookings,
  checkInBooking,
  checkOutBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('customer', 'admin'));

router.get('/available-slots', getAvailableSlots);
router.get('/my', getMyBookings);
router.post('/', createBooking);
router.post('/:id/check-in', checkInBooking);
router.post('/:id/check-out', checkOutBooking);

module.exports = router;
