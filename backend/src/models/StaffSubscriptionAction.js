const mongoose = require('mongoose');

const staffSubscriptionActionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    entitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipSlotEntitlement',
      default: null,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    evidenceImageUrl: {
      type: String,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

staffSubscriptionActionSchema.index(
  { staffId: 1, idempotencyKey: 1 },
  { unique: true }
);

module.exports = mongoose.model('StaffSubscriptionAction', staffSubscriptionActionSchema);
