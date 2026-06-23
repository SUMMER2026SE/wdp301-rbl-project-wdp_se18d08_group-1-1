const express = require('express');
const router = express.Router();
const ticketPackageController = require('../controllers/ticketPackageController');

// TODO: Add auth middleware if needed (e.g. authMiddleware, requireAdmin)

// Public/Customer/Kiosk routes
router.get('/active', ticketPackageController.getActivePackages);

// Admin routes
router.get('/', ticketPackageController.getAllPackages);
router.post('/', ticketPackageController.createPackage);
router.get('/:id', ticketPackageController.getPackageById);
router.put('/:id', ticketPackageController.updatePackage);
router.delete('/:id', ticketPackageController.deletePackage);

module.exports = router;
