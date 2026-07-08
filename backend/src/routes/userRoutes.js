const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const subscriptionController = require('../controllers/subscriptionController');

router.use(protect);
router.use(authorize('customer'));

router.get('/membership', subscriptionController.getMembership);

module.exports = router;
