const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  listCustomers,
  resolveBookingQr,
  transitionBookingByQr,
  updateCustomerStatus,
  updateCustomer,
} = require('../controllers/staffController');

const router = express.Router();

router.use(protect, authorize('staff', 'admin'));

router.post('/bookings/qr/resolve', resolveBookingQr);
router.post('/bookings/:id/transition', transitionBookingByQr);

// Customers
router.get('/users', listCustomers);
router.put('/users/:id/status', updateCustomerStatus);
router.put('/users/:id', updateCustomer);

module.exports = router;
