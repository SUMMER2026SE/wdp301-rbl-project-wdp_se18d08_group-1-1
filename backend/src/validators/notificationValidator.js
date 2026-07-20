const { body, query } = require('express-validator');

/**
 * Validation rules for creating a notification (Admin/Staff)
 */
const createNotificationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 2000 })
    .withMessage('Content must not exceed 2000 characters'),
  body('type')
    .optional()
    .isIn(['SYSTEM', 'PARKING', 'BOOKING', 'WALLET', 'PAYMENT', 'ACCOUNT', 'PROMOTION', 'CAMERA', 'VIOLATION'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'])
    .withMessage('Priority must be INFO, SUCCESS, WARNING, ERROR, or SYSTEM'),
  body('targetType')
    .notEmpty()
    .withMessage('targetType is required')
    .isIn(['ALL_USERS', 'SINGLE_USER', 'MULTI_USER', 'ROLE_BASED'])
    .withMessage('Invalid targetType'),
  body('targetUsers')
    .optional()
    .isArray()
    .withMessage('targetUsers must be an array')
    .bail()
    .custom((targetUsers, { req }) => {
      const uniqueUsers = new Set(targetUsers.map(String));

      if (req.body.targetType === 'SINGLE_USER' && targetUsers.length !== 1) {
        throw new Error('SINGLE_USER requires exactly one recipient');
      }
      if (req.body.targetType === 'MULTI_USER' && uniqueUsers.size < 2) {
        throw new Error('MULTI_USER requires at least two different recipients');
      }
      if (targetUsers.length > 500) {
        throw new Error('A notification can target at most 500 selected users');
      }
      if (req.body.targetType === 'ALL_USERS' && targetUsers.length > 0) {
        throw new Error('ALL_USERS must not contain selected recipients');
      }
      if (req.body.targetType === 'ROLE_BASED' && targetUsers.length > 0) {
        throw new Error('ROLE_BASED must not contain selected recipients');
      }
      return true;
    }),
  body('targetUsers.*')
    .optional()
    .isMongoId()
    .withMessage('Each targetUsers value must be a valid user ID'),
  body('targetUsers')
    .custom((targetUsers, { req }) => {
      if (
        ['SINGLE_USER', 'MULTI_USER'].includes(req.body.targetType) &&
        !Array.isArray(targetUsers)
      ) {
        throw new Error('targetUsers is required for the selected target type');
      }
      return true;
    }),
  body('targetRoles')
    .optional()
    .isArray({ min: 1, max: 3 })
    .withMessage('targetRoles must contain between 1 and 3 roles')
    .bail()
    .custom((targetRoles, { req }) => {
      const allowedRoles = new Set(['admin', 'staff', 'customer']);
      const uniqueRoles = new Set(targetRoles);
      if (targetRoles.some((role) => !allowedRoles.has(role))) {
        throw new Error('targetRoles contains an invalid role');
      }
      if (uniqueRoles.size !== targetRoles.length) {
        throw new Error('targetRoles must not contain duplicate roles');
      }
      if (req.body.targetType !== 'ROLE_BASED' && targetRoles.length > 0) {
        throw new Error('targetRoles is only allowed for ROLE_BASED');
      }
      return true;
    }),
  body('targetRoles')
    .custom((targetRoles, { req }) => {
      if (
        req.body.targetType === 'ROLE_BASED' &&
        (!Array.isArray(targetRoles) || targetRoles.length === 0)
      ) {
        throw new Error('ROLE_BASED requires at least one target role');
      }
      return true;
    }),
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
    .isIn(['SYSTEM', 'PARKING', 'BOOKING', 'WALLET', 'PAYMENT', 'ACCOUNT', 'PROMOTION', 'CAMERA', 'VIOLATION'])
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
  query('contextRole')
    .optional()
    .isIn(['customer', 'staff', 'admin'])
    .withMessage('Invalid notification context role'),
];

module.exports = {
  createNotificationValidator,
  queryNotificationValidator,
};
