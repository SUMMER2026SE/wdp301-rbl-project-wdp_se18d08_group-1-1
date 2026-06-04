const mongoose = require('mongoose');

const notificationEventLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique compound index for deduplication
notificationEventLogSchema.index({ eventType: 1, referenceId: 1 }, { unique: true });

const NotificationEventLog = mongoose.model('NotificationEventLog', notificationEventLogSchema);

module.exports = NotificationEventLog;
