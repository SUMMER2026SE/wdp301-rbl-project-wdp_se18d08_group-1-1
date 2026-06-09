const express = require('express');
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Public routes
router.get('/services', getAllServices);
router.get('/services/:id', getServiceById);

// Admin routes (Protected)
// Note: Since we will mount this on /api, we handle the /admin prefix within the route
// Wait, the prompt asked for POST /api/admin/services.
// So if we mount this router on /api, the paths will be /admin/services
router.post(
  '/admin/services',
  protect,
  authorize('admin'),
  upload.single('image'),
  createService
);

router.put(
  '/admin/services/:id',
  protect,
  authorize('admin'),
  upload.single('image'),
  updateService
);

router.delete(
  '/admin/services/:id',
  protect,
  authorize('admin'),
  deleteService
);

module.exports = router;
