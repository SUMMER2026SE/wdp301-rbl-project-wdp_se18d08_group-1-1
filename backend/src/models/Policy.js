const mongoose = require('mongoose');

const POLICY_CATEGORIES = ['terms', 'privacy', 'refund', 'parking_rules', 'safety', 'other'];
const POLICY_STATUSES = ['draft', 'published', 'archived'];

const normalizeSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
      maxlength: [180, 'Policy title must not exceed 180 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Policy slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Policy slug must be URL friendly'],
    },
    category: {
      type: String,
      enum: POLICY_CATEGORIES,
      default: 'other',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Policy description must not exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: POLICY_STATUSES,
      default: 'draft',
    },
    requiresAcceptance: {
      type: Boolean,
      default: false,
    },
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyVersion',
      default: null,
    },
    currentVersionNumber: {
      type: Number,
      default: 0,
      min: 0,
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
    archivedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

policySchema.pre('validate', function normalizePolicySlug(next) {
  if (!this.slug && this.title) {
    this.slug = normalizeSlug(this.title);
  } else if (this.slug) {
    this.slug = normalizeSlug(this.slug);
  }
  next();
});

policySchema.index({ status: 1, requiresAcceptance: 1 });
policySchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Policy', policySchema);
module.exports.POLICY_CATEGORIES = POLICY_CATEGORIES;
module.exports.POLICY_STATUSES = POLICY_STATUSES;
module.exports.normalizeSlug = normalizeSlug;
