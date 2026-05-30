const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// POST /api/sessions/kiosk-entry
router.post('/kiosk-entry', sessionController.createKioskSession);

// GET /api/sessions/my-history
router.get('/my-history', protect, authorize('customer', 'admin'), sessionController.getMyHistory);

// GET /api/sessions
router.get('/', sessionController.getAllSessions);

module.exports = router;
