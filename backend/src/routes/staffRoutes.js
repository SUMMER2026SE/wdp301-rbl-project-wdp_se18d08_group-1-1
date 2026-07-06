const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  listCustomers,
  searchCustomers,
  getCustomerDetail,
  getCustomerVehicles,
  getCustomerWallet,
  getCustomerBookings,
  getCustomerParkingSessions,
  getCustomerNotifications,
  getDashboardOverview,
  updateCustomerStatus,
  updateCustomer
} = require('../controllers/staffController');

const router = express.Router();

router.use(protect, authorize('staff', 'admin'));

// Dashboard
router.get('/dashboard/overview', getDashboardOverview);

// Customers
router.get('/customers/search', searchCustomers);
router.get('/customers/:id/vehicles', getCustomerVehicles);
router.get('/customers/:id/wallet', getCustomerWallet);
router.get('/customers/:id/bookings', getCustomerBookings);
router.get('/customers/:id/parking-sessions', getCustomerParkingSessions);
router.get('/customers/:id/notifications', getCustomerNotifications);
router.get('/customers/:id', getCustomerDetail);
router.get('/customers', listCustomers);
router.patch('/customers/:id/status', updateCustomerStatus);
router.put('/customers/:id', updateCustomer);

// Backward-compatible aliases used by the existing staff UI.
router.get('/users', listCustomers);
router.put('/users/:id/status', updateCustomerStatus);
router.put('/users/:id', updateCustomer);

module.exports = router;
