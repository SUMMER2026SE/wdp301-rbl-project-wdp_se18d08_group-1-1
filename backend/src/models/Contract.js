const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    contractCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['MONTHLY_PASS', 'YEARLY_PASS', 'TRANSFER'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'TRANSFERRED'],
      default: 'DRAFT',
      index: true,
    },
    slotCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially_refunded', 'refunded', 'failed'],
      default: 'pending',
    },
    terms: {
      type: String,
      required: true,
      default: '',
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    expiredAt: {
      type: Date,
      default: null,
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

contractSchema.virtual('remainingDays').get(function remainingDays() {
  if (!this.endTime) return 0;
  const remaining = new Date(this.endTime).getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 86400000) : 0;
});

contractSchema.virtual('isExpired').get(function isExpired() {
  return this.endTime ? new Date(this.endTime).getTime() < Date.now() : false;
});

contractSchema.set('toJSON', { virtuals: true });
contractSchema.set('toObject', { virtuals: true });

contractSchema.index({ userId: 1, status: 1, createdAt: -1 });
contractSchema.index({ type: 1, status: 1 });
contractSchema.index({ status: 1, endTime: 1 });

module.exports = mongoose.model('Contract', contractSchema);
