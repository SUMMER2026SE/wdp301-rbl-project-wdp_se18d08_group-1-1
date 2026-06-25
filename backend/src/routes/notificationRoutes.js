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
  markAdminHistoryAsRead,
  markAllAdminHistoryAsRead,
  deleteAdminHistoryNotification,
  revokeNotification,
  getAutoRules,
  createAutoRule,
  updateAutoRule,
  deleteAutoRule,
  testAutoRule,
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
router.put('/admin/history/read-all', authorize('admin', 'staff'), markAllAdminHistoryAsRead);
router.put('/admin/history/:id/read', authorize('admin', 'staff'), markAdminHistoryAsRead);
router.delete('/admin/history/:id', authorize('admin', 'staff'), deleteAdminHistoryNotification);
router.put('/:id/revoke', authorize('admin', 'staff'), revokeNotification);

// ── Auto Rules routes (admin/staff) ──
router.get('/admin/rules', authorize('admin', 'staff'), getAutoRules);
router.post('/admin/rules', authorize('admin', 'staff'), createAutoRule);
router.put('/admin/rules/:eventKey', authorize('admin', 'staff'), updateAutoRule);
router.delete('/admin/rules/:eventKey', authorize('admin', 'staff'), deleteAutoRule);
router.post('/admin/rules/:eventKey/test', authorize('admin', 'staff'), testAutoRule);

module.exports = router;
