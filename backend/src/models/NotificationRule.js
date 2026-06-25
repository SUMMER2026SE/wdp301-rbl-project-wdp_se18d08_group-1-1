const mongoose = require('mongoose');

const notificationRuleSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    group: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'],
      default: 'INFO',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    channels: {
      type: [String],
      default: ['In-app'],
    },
    throttleMinutes: {
      type: Number,
      default: 10,
      min: 1,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationRuleSchema.index({ group: 1 });

const NotificationRule = mongoose.model('NotificationRule', notificationRuleSchema);

module.exports = NotificationRule;
