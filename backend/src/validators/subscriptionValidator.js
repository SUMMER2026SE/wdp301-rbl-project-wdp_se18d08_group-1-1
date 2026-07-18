const { body, param } = require('express-validator');

const subscriptionIdValidator = [
  param('subscriptionId')
    .isMongoId()
    .withMessage('subscriptionId must be valid'),
];

const renewalPaymentValidator = [
  ...subscriptionIdValidator,
  body('idempotencyKey')
    .isString()
    .trim()
    .isLength({ min: 16, max: 128 })
    .withMessage('idempotencyKey must contain 16-128 characters'),
];

const renewalVerifyValidator = [
  body('orderCode')
    .isInt({ min: 1 })
    .withMessage('orderCode must be a positive integer'),
];

module.exports = {
  subscriptionIdValidator,
  renewalPaymentValidator,
  renewalVerifyValidator,
};
