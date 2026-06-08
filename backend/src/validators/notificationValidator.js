const { body, query } = require('express-validator');

/**
 * Validation rules for creating a notification (Admin/Staff)
 */
const createNotificationValidator = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 2000 })
    .withMessage('Content must not exceed 2000 characters'),
  body('type')
    .optional()
    .isIn(['SYSTEM', 'PARKING', 'BOOKING', 'WALLET', 'PAYMENT', 'ACCOUNT', 'PROMOTION', 'CAMERA'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'])
    .withMessage('Priority must be INFO, SUCCESS, WARNING, ERROR, or SYSTEM'),
  body('targetType')
    .notEmpty()
    .withMessage('targetType is required')
    .isIn(['ALL_USERS', 'SINGLE_USER', 'MULTI_USER'])
    .withMessage('targetType must be ALL_USERS, SINGLE_USER, or MULTI_USER'),
  body('targetUsers')
    .optional()
    .isArray()
    .withMessage('targetUsers must be an array'),
];

/**
 * Validation rules for querying notifications
 */
const queryNotificationValidator = [
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
    .isIn(['SYSTEM', 'PARKING', 'BOOKING', 'WALLET', 'PAYMENT', 'ACCOUNT', 'PROMOTION', 'CAMERA'])
    .withMessage('Invalid notification type'),
  query('isRead')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isRead must be true or false'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  query('priority')
    .optional()
    .isIn(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'])
    .withMessage('Invalid priority'),
];

module.exports = {
  createNotificationValidator,
  queryNotificationValidator,
};
