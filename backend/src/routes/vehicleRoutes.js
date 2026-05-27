const express = require('express');
const router = express.Router();
const {
  getMyVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
} = require('../controllers/vehicleController');
const { protect } = require('../middlewares/authMiddleware');
const {
  addVehicleValidator,
  updateVehicleValidator,
} = require('../validators/vehicleValidator');

// All routes require authentication
router.use(protect);

router.route('/').get(getMyVehicles).post(addVehicleValidator, addVehicle);

router
  .route('/:id')
  .get(getVehicleById)
  .put(updateVehicleValidator, updateVehicle)
  .delete(deleteVehicle);

router.patch('/:id/default', setDefaultVehicle);

module.exports = router;
