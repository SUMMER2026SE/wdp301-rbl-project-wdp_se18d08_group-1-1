const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    type: {
      type: String,
      enum: ['TOP_UP', 'PAYMENT', 'REFUND'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1000, 'Minimum transaction amount is 1,000 VNĐ'],
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    description: {
      type: String,
      default: '',
    },
    // payOS specific fields (only for TOP_UP)
    payosOrderCode: {
      type: Number,
      unique: true,
      sparse: true, // Allow null for non-payOS transactions
    },
    payosPaymentLinkId: {
      type: String,
      default: null,
    },
    payosCheckoutUrl: {
      type: String,
      default: null,
    },
    payosReference: {
      type: String,
      default: null,
    },
    // Refund reference
    refSource: {
      type: String,
      default: null, // e.g. "booking", "parking"
    },
    refSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
