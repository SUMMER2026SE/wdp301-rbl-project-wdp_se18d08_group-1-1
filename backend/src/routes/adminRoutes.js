const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  uploadVehicleModel,
  deleteVehicleModel,
  listVehicleModels,
  syncAllVehicleModels,
} = require('../controllers/adminController');

const router = express.Router();

// Multer – memory storage (no disk writes), max 50 MB per model file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.glb')) {
      cb(null, true);
    } else {
      cb(new Error('Only .glb files are allowed'));
    }
  },
});

// All admin routes require a valid JWT + admin role
router.use(protect, authorize('admin'));

// Vehicle 3D models
router.get('/vehicles/models', listVehicleModels);
router.post('/vehicles/upload-model', upload.single('file'), uploadVehicleModel);
router.delete('/vehicles/upload-model', deleteVehicleModel);
router.post('/vehicles/sync-models', syncAllVehicleModels);

module.exports = router;
