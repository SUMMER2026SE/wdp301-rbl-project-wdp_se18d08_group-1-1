const { body, query } = require('express-validator');

/**
 * Validation rules for wallet top-up
 */
const topUpValidator = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isInt({ min: 10000, max: 10000000 })
    .withMessage('Amount must be between 10,000 and 10,000,000 VNĐ'),
];

/**
 * Validation rules for transaction history query
 */
const transactionQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('type')
    .optional()
    .isIn(['TOP_UP', 'PAYMENT', 'REFUND'])
    .withMessage('Type must be TOP_UP, PAYMENT, or REFUND'),
  query('status')
    .optional()
    .isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .withMessage('Status must be PENDING, COMPLETED, FAILED, or CANCELLED'),
];

module.exports = {
  topUpValidator,
  transactionQueryValidator,
};
