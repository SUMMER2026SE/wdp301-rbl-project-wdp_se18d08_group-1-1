const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  createTransferRequest,
  getTransferHistory,
  getAllTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
} = require('../controllers/bookingTransferController');
const {
  validateTransferId,
  validateCreateTransferRequest,
  validateRejectTransfer,
  validateHistoryQuery,
  validateAdminTransfersQuery,
} = require('../validators/bookingTransferValidator');

const router = express.Router();

router.use(protect);

router.post(
  '/customer/bookings/:id/transfer-request',
  authorize('customer'),
  validateCreateTransferRequest,
  createTransferRequest
);

router.get(
  '/customer/booking-transfers',
  authorize('customer'),
  validateHistoryQuery,
  getTransferHistory
);

router.get(
  '/admin/booking-transfers',
  authorize('admin'),
  validateAdminTransfersQuery,
  getAllTransferRequests
);

router.put(
  '/admin/booking-transfers/:id/approve',
  authorize('admin'),
  validateTransferId,
  approveTransferRequest
);

router.put(
  '/admin/booking-transfers/:id/reject',
  authorize('admin'),
  validateRejectTransfer,
  rejectTransferRequest
);

module.exports = router;
