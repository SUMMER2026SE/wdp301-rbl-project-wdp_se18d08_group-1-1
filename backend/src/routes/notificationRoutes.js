const express = require('express');
const router = express.Router();
const {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteUserNotification,
  getAdminHistory,
  revokeNotification,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  createNotificationValidator,
  queryNotificationValidator,
} = require('../validators/notificationValidator');

// All routes require authentication
router.use(protect);

// ── User routes (all authenticated users) ──
router.get('/', queryNotificationValidator, getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteUserNotification);

// ── Admin/Staff routes ──
router.post('/', authorize('admin', 'staff'), createNotificationValidator, createNotification);
router.get('/admin/history', authorize('admin', 'staff'), queryNotificationValidator, getAdminHistory);
router.put('/:id/revoke', authorize('admin', 'staff'), revokeNotification);

module.exports = router;
