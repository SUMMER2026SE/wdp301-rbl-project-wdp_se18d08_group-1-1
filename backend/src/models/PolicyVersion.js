const mongoose = require('mongoose');

const POLICY_VERSION_STATUSES = ['draft', 'published'];
const IMMUTABLE_FIELDS = ['title', 'summary', 'content', 'effectiveDate', 'changeNote', 'versionNumber', 'policyId'];

const policyVersionSchema = new mongoose.Schema(
  {
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: POLICY_VERSION_STATUSES,
      default: 'draft',
    },
    title: {
      type: String,
      required: [true, 'Policy version title is required'],
      trim: true,
      maxlength: [180, 'Policy version title must not exceed 180 characters'],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [1000, 'Policy summary must not exceed 1000 characters'],
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Policy content is required'],
      trim: true,
      maxlength: [50000, 'Policy content must not exceed 50000 characters'],
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    changeNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Change note must not exceed 1000 characters'],
      default: '',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
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

policyVersionSchema.index({ policyId: 1, versionNumber: 1 }, { unique: true });
policyVersionSchema.index(
  { policyId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'draft' },
  }
);
policyVersionSchema.index({ policyId: 1, status: 1, versionNumber: -1 });

policyVersionSchema.pre('save', async function preventPublishedContentEdits(next) {
  if (this.isNew) return next();

  const existing = await this.constructor.findById(this._id).lean();
  if (!existing || existing.status !== 'published') return next();

  const changedImmutableField = IMMUTABLE_FIELDS.some((field) => this.isModified(field));
  if (changedImmutableField) {
    return next(Object.assign(new Error('Published policy versions cannot be edited'), { statusCode: 409 }));
  }

  return next();
});

module.exports = mongoose.model('PolicyVersion', policyVersionSchema);
module.exports.POLICY_VERSION_STATUSES = POLICY_VERSION_STATUSES;
