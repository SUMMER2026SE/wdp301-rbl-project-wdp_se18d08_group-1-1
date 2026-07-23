const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const statisticsController = require('../controllers/statisticsController');
const { statisticsQueryValidator } = require('../validators/statisticsValidator');

const router = express.Router();

router.use(protect);

router.get(
  '/customer/bookings',
  authorize('customer', 'admin'),
  statisticsQueryValidator,
  statisticsController.getCustomerBookings
);
router.get(
  '/admin/bookings',
  authorize('staff', 'admin'),
  statisticsQueryValidator,
  statisticsController.getAdminBookings
);
router.get(
  '/admin/subscriptions',
  authorize('staff', 'admin'),
  statisticsQueryValidator,
  statisticsController.getAdminSubscriptions
);
router.get(
  '/admin/platform-revenue',
  authorize('staff', 'admin'),
  statisticsQueryValidator,
  statisticsController.getAdminPlatformRevenue
);

module.exports = router;
