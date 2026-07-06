const { validationResult } = require('express-validator');
const bookingTransferService = require('../services/bookingTransferService');
const notificationTriggers = require('../services/notificationTriggers');

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

const notifySafely = (promise, label) => {
  Promise.resolve(promise).catch((error) => {
    console.error(`[BookingTransfer] ${label} notification failed:`, error.message);
  });
};

const createTransferRequest = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const transfer = await bookingTransferService.createTransferRequest({
      bookingId: req.params.id,
      fromUserId: req.user._id,
      toUserId: req.body.toUserId,
      reason: req.body.reason,
    });

    notifySafely(
      notificationTriggers.notifyTransferRequestCreated(req.app, transfer),
      'created'
    );

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

const getTransferHistory = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await bookingTransferService.getTransferHistory(req.user._id, req.query);

    res.status(200).json({
      success: true,
      data: result.transfers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTransferRequests = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const result = await bookingTransferService.getAllTransferRequests(req.query);

    res.status(200).json({
      success: true,
      data: result.transfers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const approveTransferRequest = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const transfer = await bookingTransferService.approveAndCompleteTransfer(req.params.id, req.user._id);

    notifySafely(
      notificationTriggers.notifyTransferApproved(req.app, transfer),
      'approved'
    );
    notifySafely(
      notificationTriggers.notifyTransferCompleted(req.app, transfer),
      'completed'
    );

    res.status(200).json({
      success: true,
      message: 'Transfer request approved and completed successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

const rejectTransferRequest = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const transfer = await bookingTransferService.rejectTransferRequest(
      req.params.id,
      req.body.rejectionReason
    );

    notifySafely(
      notificationTriggers.notifyTransferRejected(req.app, transfer),
      'rejected'
    );

    res.status(200).json({
      success: true,
      message: 'Transfer request rejected successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransferRequest,
  getTransferHistory,
  getAllTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
};
