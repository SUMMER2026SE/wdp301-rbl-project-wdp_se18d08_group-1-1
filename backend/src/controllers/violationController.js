const { validationResult } = require('express-validator');
const violationService = require('../services/violationService');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: errors.array().map((error) => ({
      field: error.path || error.param || 'unknown',
      message: error.msg,
    })),
  });
  return true;
};

const createViolation = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const violation = await violationService.createViolation(req.body, req.user._id, req.app);

    res.status(201).json({
      success: true,
      message: 'Violation created successfully',
      data: violation,
    });
  } catch (error) {
    next(error);
  }
};

const getViolations = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await violationService.getViolations(req.query, req.user.role, req.user._id);

    res.status(200).json({
      success: true,
      data: result.violations,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getViolationById = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const violation = await violationService.getViolationById(req.params.id, req.user.role, req.user._id);

    res.status(200).json({
      success: true,
      data: violation,
    });
  } catch (error) {
    next(error);
  }
};

const payViolation = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await violationService.payViolation(req.params.id, req.user._id, req.app);

    res.status(200).json({
      success: true,
      message: 'Violation paid successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const cancelViolation = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const violation = await violationService.cancelViolation(req.params.id, req.app);

    res.status(200).json({
      success: true,
      message: 'Violation cancelled successfully',
      data: violation,
    });
  } catch (error) {
    next(error);
  }
};

const getUserHistory = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await violationService.getUserViolationHistory(req.params.userId);

    res.status(200).json({
      success: true,
      data: result.violations,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

const getStatistics = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const statistics = await violationService.getViolationStatistics(req.query);

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createViolation,
  getViolations,
  getViolationById,
  payViolation,
  cancelViolation,
  getUserHistory,
  getStatistics,
};
