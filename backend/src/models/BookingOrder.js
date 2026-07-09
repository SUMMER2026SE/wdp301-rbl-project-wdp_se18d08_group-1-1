const mongoose = require('mongoose');

const bookingOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'partially_completed', 'completed'],
      default: 'pending',
    },
    itemCount: {
      type: Number,
      required: true,
      min: 1,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

bookingOrderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
bookingOrderSchema.index({ userId: 1, createdAt: -1 });
bookingOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BookingOrder', bookingOrderSchema);
