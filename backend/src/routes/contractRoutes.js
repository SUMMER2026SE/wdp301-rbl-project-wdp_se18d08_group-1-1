const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const controller = require('../controllers/contractController');
const {
  validateContractId,
  validateCustomerContractsQuery,
  validateAdminContractsQuery,
  validateCancelContract,
  validateUpdateTerms,
  validateStatsQuery,
} = require('../validators/contractValidator');

const router = express.Router();

router.use(protect);

router.get('/customer/contracts', authorize('customer'), validateCustomerContractsQuery, controller.getCustomerContracts);
router.get('/contracts/code/:contractCode', controller.getContractByCode);
router.get('/contracts/:id/pdf', validateContractId, controller.generatePDF);
router.get('/contracts/:id', validateContractId, controller.getContractById);
router.get('/admin/contracts/statistics', authorize('admin'), validateStatsQuery, controller.getStatistics);
router.get('/admin/contracts/terms/:type', authorize('admin'), controller.getTemplateHistory);
router.put('/admin/contracts/terms', authorize('admin'), validateUpdateTerms, controller.updateContractTerms);
router.get('/admin/contracts', authorize('admin', 'staff'), validateAdminContractsQuery, controller.getAllContracts);
router.put('/admin/contracts/:id/cancel', authorize('admin'), validateCancelContract, controller.cancelContract);

module.exports = router;
