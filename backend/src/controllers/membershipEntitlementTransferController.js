const { validationResult } = require('express-validator');
const service = require('../services/membershipEntitlementTransferService');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((item) => ({
      field: item.path || item.param,
      message: item.msg,
    })),
  });
  return true;
};

exports.create = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.createTransfer({
      entitlementId: req.params.entitlementId,
      fromUserId: req.user._id,
      toUserId: req.body.toUserId,
      toUserEmail: req.body.toUserEmail,
      askingPrice: req.body.askingPrice,
      reason: req.body.reason,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.accept = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.acceptTransfer(req.params.id, req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.reject = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.rejectTransfer(
      req.params.id,
      req.user._id,
      req.body.reason
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.approveTransfer(req.params.id, req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.adminReject = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.rejectByAdmin(
      req.params.id,
      req.user._id,
      req.body.reason
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.settle = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const data = await service.settleTransfer(req.params.id, req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.listMine = async (req, res, next) => {
  try {
    const data = await service.listTransfers(req.user._id, req.user.role, req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.listAdmin = async (req, res, next) => {
  try {
    const data = await service.listTransfers(req.user._id, 'admin', req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.pdf = async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const pdf = await service.generateTransferPdf(
      req.params.id,
      req.user._id,
      req.user.role
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Membership-Transfer-${req.params.id}.pdf"`
    );
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
};
