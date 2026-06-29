const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['ORIGINAL', 'TRANSFER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRANSFERRED', 'TERMINATED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    transferredFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    transferredAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

contractSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Contract', contractSchema);
