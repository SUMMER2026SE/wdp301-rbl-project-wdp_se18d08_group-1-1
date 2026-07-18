const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const statisticsController = require('../controllers/statisticsController');
const { statisticsQueryValidator } = require('../validators/statisticsValidator');
const { isEnabled, defaultForCurrentEnvironment } = require('../utils/featureFlags');

const router = express.Router();

router.use((req, res, next) => {
  if (!isEnabled('STATISTICS_V2_ENABLED', defaultForCurrentEnvironment())) {
    return res.status(404).json({ success: false, message: 'Statistics are not enabled.' });
  }
  next();
});
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

module.exports = router;
