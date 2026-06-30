const express = require('express');
const {
  getAvailableSlots,
  quoteBooking,
  quoteBulkBooking,
  createBookingHold,
  createBulkBookingHolds,
  releaseBookingHold,
  releaseBulkBookingHolds,
  createBooking,
  createBulkBooking,
  getBookingOrder,
  getMyBookings,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
  updateBookingLicensePlate,
  extendBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('customer', 'admin'));

router.get('/available-slots', getAvailableSlots);
router.get('/my', getMyBookings);
router.post('/quote', quoteBooking);
router.post('/holds', createBookingHold);
router.delete('/holds/:id', releaseBookingHold);
router.post('/bulk/quote', quoteBulkBooking);
router.post('/bulk/holds', createBulkBookingHolds);
router.delete('/bulk/holds', releaseBulkBookingHolds);
router.post('/bulk', createBulkBooking);
router.get('/orders/:id', getBookingOrder);
router.post('/', createBooking);
router.post('/:id/cancel', cancelBooking);
router.patch('/:id/license-plate', updateBookingLicensePlate);
router.post('/:id/extend', extendBooking);
router.post('/:id/check-in', checkInBooking);
router.post('/:id/check-out', checkOutBooking);
router.post('/:id/complete', checkOutBooking);

module.exports = router;
