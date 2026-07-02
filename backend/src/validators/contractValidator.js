const { body, param, query } = require('express-validator');

const STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'TRANSFERRED'];
const TYPES = ['MONTHLY_PASS', 'YEARLY_PASS', 'TRANSFER'];

const validateContractId = [
  param('id').isMongoId().withMessage('Invalid contract ID format'),
];

const validateCustomerContractsQuery = [
  query('status').optional().isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  query('type').optional().isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

const validateAdminContractsQuery = [
  ...validateCustomerContractsQuery,
  query('userId').optional().isMongoId().withMessage('Invalid userId format'),
  query('vehicleId').optional().isMongoId().withMessage('Invalid vehicleId format'),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search must not exceed 100 characters'),
];

const validateCancelContract = [
  ...validateContractId,
  body('cancellationReason')
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .bail()
    .isLength({ min: 10, max: 500 })
    .withMessage('Ly do huy phai co it nhat 10 ky tu'),
];

const validateUpdateTerms = [
  body('type').isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('content must be at least 50 characters'),
];

const validateStatsQuery = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
];

module.exports = {
  validateContractId,
  validateCustomerContractsQuery,
  validateAdminContractsQuery,
  validateCancelContract,
  validateUpdateTerms,
  validateStatsQuery,
};
