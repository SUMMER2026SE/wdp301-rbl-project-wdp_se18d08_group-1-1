const express = require('express');
const {
  createViolation,
  getViolations,
  getViolationById,
  payViolation,
  cancelViolation,
  getUserHistory,
  getStatistics,
} = require('../controllers/violationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  validateCreateViolation,
  validateViolationId,
  validateUserIdParam,
  validateViolationQuery,
  validateRevenueQuery,
} = require('../validators/violationValidators');

const router = express.Router();

router.use(protect);

router.get('/statistics', authorize('admin'), validateRevenueQuery, getStatistics);
router.get('/user/:userId', authorize('admin'), validateUserIdParam, getUserHistory);
router.get('/', authorize('customer', 'staff', 'admin'), validateViolationQuery, getViolations);
router.post('/', authorize('staff', 'admin'), validateCreateViolation, createViolation);
router.get('/:id', authorize('customer', 'staff', 'admin'), validateViolationId, getViolationById);
router.post('/:id/pay', authorize('customer'), validateViolationId, payViolation);
router.put('/:id/cancel', authorize('admin'), validateViolationId, cancelViolation);

module.exports = router;
