const { validationResult } = require('express-validator');
const revenueService = require('../services/revenueService');

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

const getViolationRevenue = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await revenueService.getViolationRevenue(req.query);

    res.status(200).json({
      success: true,
      data: result.revenues,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getRevenueStatistics = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const statistics = await revenueService.getRevenueStatistics(req.query);

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getViolationRevenue,
  getRevenueStatistics,
};
