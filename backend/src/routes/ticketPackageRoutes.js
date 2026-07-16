const express = require('express');
const router = express.Router();
const ticketPackageController = require('../controllers/ticketPackageController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public/Customer/Kiosk routes
router.get('/active', ticketPackageController.getActivePackages);

// Staff console routes
router.use(protect, authorize('staff', 'admin'));
router.get('/', ticketPackageController.getAllPackages);
router.post('/', ticketPackageController.createPackage);
router.get('/:id', ticketPackageController.getPackageById);
router.put('/:id', ticketPackageController.updatePackage);
router.delete('/:id', ticketPackageController.deletePackage);

module.exports = router;
