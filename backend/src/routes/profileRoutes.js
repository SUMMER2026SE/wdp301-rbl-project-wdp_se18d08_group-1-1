const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
} = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');
const { changePasswordValidator } = require('../validators/authValidator');

// All profile routes are protected
router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/change-password', changePasswordValidator, changePassword);

module.exports = router;
