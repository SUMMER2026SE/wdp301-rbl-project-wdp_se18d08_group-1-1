const { body, param, query } = require('express-validator');

const TRANSFER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
const HISTORY_ROLES = ['transferor', 'transferee'];

const validateTransferId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid transfer request ID format'),
];

const validateCreateTransferRequest = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  body('toUserId')
    .notEmpty()
    .withMessage('Transferee is required')
    .bail()
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .bail()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

const validateRejectTransfer = [
  ...validateTransferId,
  body('rejectionReason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .bail()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

const validateHistoryQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(HISTORY_ROLES)
    .withMessage(`role must be one of: ${HISTORY_ROLES.join(', ')}`),
];

const validateAdminTransfersQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(TRANSFER_STATUSES)
    .withMessage(`status must be one of: ${TRANSFER_STATUSES.join(', ')}`),
];

module.exports = {
  validateTransferId,
  validateCreateTransferRequest,
  validateRejectTransfer,
  validateHistoryQuery,
  validateAdminTransfersQuery,
};
