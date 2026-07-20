const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middlewares/authMiddleware');
const controller = require('../controllers/membershipEntitlementTransferController');

const router = express.Router();
router.use(protect);

const transferId = param('id').isMongoId().withMessage('Invalid transfer ID');
const entitlementId = param('entitlementId')
  .isMongoId()
  .withMessage('Invalid entitlement ID');
const reason = body('reason').isString().trim().isLength({ min: 3, max: 500 });

router.post(
  '/customer/membership-entitlements/:entitlementId/transfers',
  authorize('customer'),
  entitlementId,
  body('toUserId').optional().isMongoId(),
  body('toUserEmail').optional().isEmail().normalizeEmail(),
  body().custom((value) => {
    if (!value.toUserId && !value.toUserEmail) {
      throw new Error('Recipient user ID or email is required');
    }
    return true;
  }),
  body('askingPrice').isInt({ min: 0 }),
  reason,
  controller.create
);
router.get(
  '/customer/membership-entitlement-transfers',
  authorize('customer'),
  controller.listMine
);
router.put(
  '/customer/membership-entitlement-transfers/:id/accept',
  authorize('customer'),
  transferId,
  controller.accept
);
router.put(
  '/customer/membership-entitlement-transfers/:id/reject',
  authorize('customer'),
  transferId,
  body('reason').optional().isString().trim().isLength({ max: 500 }),
  controller.reject
);
router.post(
  '/customer/membership-entitlement-transfers/:id/settle-wallet',
  authorize('customer'),
  transferId,
  controller.settle
);
router.get(
  '/membership-entitlement-transfers/:id/pdf',
  transferId,
  controller.pdf
);
router.get(
  '/admin/membership-entitlement-transfers',
  authorize('admin'),
  controller.listAdmin
);
router.put(
  '/admin/membership-entitlement-transfers/:id/approve',
  authorize('admin'),
  transferId,
  controller.approve
);
router.put(
  '/admin/membership-entitlement-transfers/:id/reject',
  authorize('admin'),
  transferId,
  reason,
  controller.adminReject
);

module.exports = router;
