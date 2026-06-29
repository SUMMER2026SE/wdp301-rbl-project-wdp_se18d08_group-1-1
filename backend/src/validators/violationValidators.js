const { body, param, query } = require('express-validator');

const STATUS_VALUES = ['PENDING', 'PAID', 'CANCELLED'];

const objectIdRule = (field, location = body) =>
  location(field).isMongoId().withMessage(`${field} không đúng định dạng ObjectId`);

const validateCreateViolation = [
  objectIdRule('userId'),
  objectIdRule('vehicleId'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề vi phạm là bắt buộc')
    .isLength({ max: 200 })
    .withMessage('Tiêu đề không được vượt quá 200 ký tự'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  body('fineAmount')
    .notEmpty()
    .withMessage('Số tiền phạt là bắt buộc')
    .bail()
    .isInt({ min: 10000 })
    .withMessage('Số tiền phạt tối thiểu là 10,000 VND')
    .bail()
    .isInt({ max: 50000000 })
    .withMessage('Số tiền phạt tối đa là 50,000,000 VND'),
  body('bookingId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('bookingId không đúng định dạng ObjectId'),
  body('parkingSessionId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('parkingSessionId không đúng định dạng ObjectId'),
  body('evidenceImages').optional().isArray().withMessage('evidenceImages phải là một mảng'),
  body('evidenceImages.*').optional().isString().trim().isLength({ max: 1000 }),
];

const validateViolationId = [
  objectIdRule('id', param),
];

const validateUserIdParam = [
  objectIdRule('userId', param),
];

const validateViolationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phải nằm trong khoảng 1 đến 100'),
  query('status').optional().isIn(STATUS_VALUES).withMessage(`status phải là một trong: ${STATUS_VALUES.join(', ')}`),
  query('userId').optional().isMongoId().withMessage('userId không đúng định dạng ObjectId'),
  query('vehicleId').optional().isMongoId().withMessage('vehicleId không đúng định dạng ObjectId'),
  query('startDate').optional().isISO8601().withMessage('startDate phải là ngày ISO hợp lệ'),
  query('endDate').optional().isISO8601().withMessage('endDate phải là ngày ISO hợp lệ'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search không được vượt quá 100 ký tự'),
];

const validateRevenueQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phải nằm trong khoảng 1 đến 100'),
  query('startDate').optional().isISO8601().withMessage('startDate phải là ngày ISO hợp lệ'),
  query('endDate').optional().isISO8601().withMessage('endDate phải là ngày ISO hợp lệ'),
];

module.exports = {
  validateCreateViolation,
  validateViolationId,
  validateUserIdParam,
  validateViolationQuery,
  validateRevenueQuery,
};
