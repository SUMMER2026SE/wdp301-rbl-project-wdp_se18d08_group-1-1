const mongoose = require('mongoose');

const contractTermsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['MONTHLY_PASS', 'YEARLY_PASS', 'TRANSFER'],
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

contractTermsSchema.index({ type: 1, isActive: 1, version: -1 });

module.exports = mongoose.model('ContractTerms', contractTermsSchema);
