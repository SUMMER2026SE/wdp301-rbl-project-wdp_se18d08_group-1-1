const mongoose = require('mongoose');

const policyAcceptanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true,
    },
    policyVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyVersion',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'kiosk'],
      default: 'web',
    },
  },
  { timestamps: true }
);

policyAcceptanceSchema.index({ userId: 1, policyVersionId: 1 }, { unique: true });
policyAcceptanceSchema.index({ userId: 1, policyId: 1 });

module.exports = mongoose.model('PolicyAcceptance', policyAcceptanceSchema);
