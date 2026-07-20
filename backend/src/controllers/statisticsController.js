const { validationResult } = require('express-validator');
const statisticsService = require('../services/statisticsService');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({
    success: false,
    message: 'Invalid statistics filters',
    errors: errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
    })),
  });
  return true;
};

const getCustomerBookings = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const data = await statisticsService.getCustomerBookingStatistics(req.user._id, req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAdminBookings = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const data = await statisticsService.getAdminBookingStatistics(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAdminSubscriptions = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const data = await statisticsService.getAdminSubscriptionStatistics(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomerBookings,
  getAdminBookings,
  getAdminSubscriptions,
};
