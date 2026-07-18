const { query } = require('express-validator');

const statisticsQueryValidator = [
  query('range')
    .optional()
    .isIn(['7d', '30d', 'month', 'all'])
    .withMessage('range must be 7d, 30d, month, or all'),
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
