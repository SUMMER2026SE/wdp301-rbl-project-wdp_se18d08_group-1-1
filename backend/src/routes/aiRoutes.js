const express = require('express');
const router = express.Router();
const { scanPlate } = require('../controllers/aiController');

// @route   POST /api/ai/scan-plate
// @desc    Scan license plate from base64 image using PlateRecognizer
// @access  Public
router.post('/scan-plate', scanPlate);

module.exports = router;
