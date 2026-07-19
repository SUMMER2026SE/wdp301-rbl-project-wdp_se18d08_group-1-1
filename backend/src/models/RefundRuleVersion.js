const mongoose = require('mongoose');

const percentageField = {
  type: Number,
  required: true,
  min: 0,
  max: 100,
  validate: {
    validator: Number.isInteger,
    message: 'Percentage must be an integer',
  },
};

const cancellationTierSchema = new mongoose.Schema(
  {
    minimumMinutesBeforeStart: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Cancellation threshold must be an integer',
      },
    },
    refundPercent: percentageField,
  },
  { _id: false }
);

const refundRuleVersionSchema = new mongoose.Schema(
  {
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
      unique: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    cancellationTiers: {
      type: [cancellationTierSchema],
      required: true,
      validate: {
        validator: (tiers) =>
          Array.isArray(tiers) &&
          tiers.length > 0 &&
          new Set(tiers.map((tier) => tier.minimumMinutesBeforeStart)).size === tiers.length,
        message: 'Cancellation tiers must be non-empty and have unique thresholds',
      },
    },
    noShowRefundPercent: percentageField,
    minimumBillableMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1440,
      validate: {
        validator: Number.isInteger,
        message: 'Minimum billable minutes must be an integer',
      },
    },
    earlyCheckout: {
      mode: {
        type: String,
        enum: ['actual_usage', 'fixed_refund_percent', 'no_refund'],
        required: true,
      },
      fixedRefundPercent: percentageField,
      feePercent: percentageField,
    },
    serviceRefundPercent: {
      pending: percentageField,
      inProgress: percentageField,
      done: percentageField,
      cancelled: percentageField,
    },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

refundRuleVersionSchema.index({ policyId: 1, versionNumber: 1 }, { unique: true });

refundRuleVersionSchema.pre('validate', function normalizeTiers(next) {
  if (Array.isArray(this.cancellationTiers)) {
    this.cancellationTiers.sort(
      (left, right) => right.minimumMinutesBeforeStart - left.minimumMinutesBeforeStart
    );
  }
  next();
});

refundRuleVersionSchema.pre('save', async function preventPublishedRuleEdits(next) {
  if (this.isNew) return next();

  const existing = await this.constructor.findById(this._id).lean();
  if (!existing || existing.status !== 'published') return next();

  const immutableFields = [
    'policyId',
    'policyVersionId',
    'versionNumber',
    'cancellationTiers',
    'noShowRefundPercent',
    'minimumBillableMinutes',
    'earlyCheckout',
    'serviceRefundPercent',
  ];

  if (immutableFields.some((field) => this.isModified(field))) {
    return next(
      Object.assign(new Error('Published refund rule versions cannot be edited'), {
        statusCode: 409,
      })
    );
  }

  return next();
});

module.exports = mongoose.model('RefundRuleVersion', refundRuleVersionSchema);
