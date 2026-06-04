const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate user-notification pairs
userNotificationSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

// Optimized query index for fetching user's notifications
userNotificationSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

// Index for unread count queries
userNotificationSchema.index({ userId: 1, isDeleted: 1, isRead: 1 });

const UserNotification = mongoose.model('UserNotification', userNotificationSchema);

module.exports = UserNotification;
