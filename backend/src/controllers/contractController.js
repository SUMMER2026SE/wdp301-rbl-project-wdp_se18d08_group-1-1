const { validationResult } = require('express-validator');
const contractService = require('../services/contractService');
const contractTermsService = require('../services/contractTermsService');
const contractReportService = require('../services/contractReportService');
const pdfService = require('../services/pdfService');

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

const getCustomerContracts = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const result = await contractService.getCustomerContracts(req.user._id, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getContractById = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const contract = await contractService.getContractById(req.params.id, req.user._id, req.user.role);
    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

const getContractByCode = async (req, res, next) => {
  try {
    const contract = await contractService.getContractByCode(req.params.contractCode, req.user._id, req.user.role);
    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

const generatePDF = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const contract = await contractService.getContractById(req.params.id, req.user._id, req.user.role);
    const pdf = await pdfService.generateContractPDF(contract);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractCode}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
};

const getAllContracts = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const result = await contractService.getAllContracts(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const cancelContract = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const contract = await contractService.cancelContract(
      req.params.id,
      req.body.cancellationReason,
      req.user._id,
      req.app
    );
    res.status(200).json({ success: true, message: 'Contract cancelled successfully', data: contract });
  } catch (error) {
    next(error);
  }
};

const updateContractTerms = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const terms = await contractTermsService.updateTemplate(req.body.type, req.body.content, req.user._id);
    console.log(`[ContractAudit] admin=${req.user._id} updated terms type=${req.body.type} at=${new Date().toISOString()}`);
    res.status(200).json({ success: true, data: terms });
  } catch (error) {
    next(error);
  }
};

const getTemplateHistory = async (req, res, next) => {
  try {
    const terms = await contractTermsService.getTemplateHistory(req.params.type);
    res.status(200).json({ success: true, data: terms });
  } catch (error) {
    next(error);
  }
};

const getStatistics = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const stats = await contractReportService.getStatistics(req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomerContracts,
  getContractById,
  getContractByCode,
  generatePDF,
  getAllContracts,
  cancelContract,
  updateContractTerms,
  getTemplateHistory,
  getStatistics,
};
