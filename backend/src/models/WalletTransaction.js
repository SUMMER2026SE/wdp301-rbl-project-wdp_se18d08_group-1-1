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
      enum: [
        'TOP_UP',
        'PAYMENT',
        'REFUND',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'TRANSFER_FEE',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1000, 'Minimum transaction amount is 1,000 VND'],
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
    idempotencyKey: {
      type: String,
      default: undefined,
      trim: true,
      set: (value) => {
        const normalized = String(value || '').trim();
        return normalized || undefined;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1 });
walletTransactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
