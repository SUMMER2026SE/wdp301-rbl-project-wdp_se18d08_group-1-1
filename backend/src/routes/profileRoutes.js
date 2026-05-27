const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
} = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');
const { changePasswordValidator } = require('../validators/authValidator');
const { upload } = require('../middlewares/uploadMiddleware');

// All profile routes are protected
router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/change-password', changePasswordValidator, changePassword);

// Avatar upload — field name must be "avatar" in the form-data request
router.post('/avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;
