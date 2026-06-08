const { validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const { emitNotification, broadcastNotification } = require('../sockets/notificationSocket');

/**
 * @desc    Create and send a notification (Admin/Staff)
 * @route   POST /api/notifications
 * @access  Private (admin, staff)
 */
const createNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { title, content, type, priority, targetType, targetUsers } = req.body;
    const createdBy = req.user._id;
    const io = req.app.get('io');

    let result;

    if (targetType === 'ALL_USERS') {
      result = await notificationService.createForAllUsers(
        { title, content, type, priority },
        createdBy
      );
      // Broadcast to all online users
      if (io) {
        broadcastNotification(io, result.notification);
      }

      return res.status(201).json({
        success: true,
        message: `Notification sent to ${result.userIds.length} users`,
        data: result.notification,
      });
    }

    if (targetType === 'SINGLE_USER') {
      if (!targetUsers || targetUsers.length !== 1) {
        return res.status(400).json({
          success: false,
          message: 'targetUsers must contain exactly 1 user ID for SINGLE_USER',
        });
      }

      const notification = await notificationService.createForUser(
        targetUsers[0],
        { title, content, type, priority },
        createdBy
      );

      if (io) {
        await emitNotification(io, targetUsers[0], notification);
      }

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully',
        data: notification,
      });
    }

    if (targetType === 'MULTI_USER') {
      if (!targetUsers || targetUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'targetUsers must contain at least 1 user ID for MULTI_USER',
        });
      }

      const notification = await notificationService.createForUsers(
        targetUsers,
        { title, content, type, priority },
        createdBy
      );

      if (io) {
        for (const uid of targetUsers) {
          await emitNotification(io, uid, notification);
        }
      }

      return res.status(201).json({
        success: true,
        message: `Notification sent to ${targetUsers.length} users`,
        data: notification,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid targetType',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's notifications (paginated, filtered)
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { page, limit, type, isRead, search } = req.query;
    const result = await notificationService.getUserNotifications(req.user._id, {
      page,
      limit,
      type,
      isRead,
      search,
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.user._id, req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteUserNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.user._id, req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin notification history
 * @route   GET /api/notifications/admin/history
 * @access  Private (admin, staff)
 */
const getAdminHistory = async (req, res, next) => {
  try {
    const { page, limit, type } = req.query;
    const result = await notificationService.getAdminNotifications({ page, limit, type });

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke a notification (admin only)
 * @route   PUT /api/notifications/:id/revoke
 * @access  Private (admin, staff)
 */
const revokeNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.revokeNotification(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification revoked',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteUserNotification,
  getAdminHistory,
  revokeNotification,
};
