const { body, query } = require('express-validator');
const { POLICY_CATEGORIES } = require('../models/Policy');

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const { normalizeRule } = require('../services/refundEngine');

const optionalRefundRuleValidator = () =>
  body('refundRule')
    .optional()
    .custom((value) => {
      normalizeRule(value);
      return true;
    });

const policyMetadataValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 180 })
    .withMessage('Title must be between 1 and 180 characters'),
  body('slug')
    .optional({ checkFalsy: true })
    .trim()
    .matches(slugPattern)
    .withMessage('Slug must be URL friendly'),
  body('category')
    .optional()
    .isIn(POLICY_CATEGORIES)
    .withMessage('Invalid policy category'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('requiresAcceptance')
    .optional()
    .custom((value) => ['true', 'false'].includes(String(value)) || typeof value === 'boolean')
    .withMessage('requiresAcceptance must be a boolean'),
  body('controlsBookingRefunds')
    .optional()
    .custom((value) => ['true', 'false'].includes(String(value)) || typeof value === 'boolean')
    .withMessage('controlsBookingRefunds must be a boolean'),
];

const policyVersionValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 180 })
    .withMessage('Version title must be between 1 and 180 characters'),
  body('summary')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Summary must not exceed 1000 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be between 1 and 50000 characters'),
  body('effectiveDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('effectiveDate must be a valid date'),
  body('changeNote')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Change note must not exceed 1000 characters'),
  optionalRefundRuleValidator(),
];

const createPolicyValidator = [
  ...policyMetadataValidator.map((validator) => validator),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 180 })
    .withMessage('Title must not exceed 180 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 50000 })
    .withMessage('Content must not exceed 50000 characters'),
  body('summary')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Summary must not exceed 1000 characters'),
  body('effectiveDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('effectiveDate must be a valid date'),
  body('changeNote')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Change note must not exceed 1000 characters'),
  optionalRefundRuleValidator(),
];

const acceptanceQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = {
  acceptanceQueryValidator,
  createPolicyValidator,
  policyMetadataValidator,
  policyVersionValidator,
};
