const { query } = require('express-validator');

const statisticsQueryValidator = [
  query('range')
    .optional()
    .isIn(['daily', 'today', '7d', '30d', 'month', 'all'])
    .withMessage('range must be daily, today, 7d, 30d, month, or all'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must use YYYY-MM-DD format')
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('date must be a valid calendar date'),
  query('floorId')
    .optional()
    .isMongoId()
    .withMessage('floorId must be a valid MongoDB ObjectId'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO date'),
];

module.exports = { statisticsQueryValidator };
