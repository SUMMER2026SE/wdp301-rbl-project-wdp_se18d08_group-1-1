const express = require('express');
const {
  getViolationRevenue,
  getRevenueStatistics,
} = require('../controllers/revenueController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateRevenueQuery } = require('../validators/violationValidators');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/violations/statistics', validateRevenueQuery, getRevenueStatistics);
router.get('/violations', validateRevenueQuery, getViolationRevenue);

module.exports = router;
