const mongoose = require('mongoose');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

const bookingHoldSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingFloor',
      required: true,
    },
    slotCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    licensePlate: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'released', 'consumed', 'expired'],
      default: 'active',
    },
    clientItemId: {
      type: String,
      trim: true,
      default: '',
    },
    holdGroupId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

bookingHoldSchema.pre('validate', function normalizeHold(next) {
  if (this.licensePlate) {
    this.licensePlate = normalizeLicensePlate(this.licensePlate);
  }
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error('Hold endTime must be after startTime'));
  }
  return next();
});

bookingHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
bookingHoldSchema.index({ floorId: 1, slotCode: 1, status: 1, expiresAt: 1 });
bookingHoldSchema.index({ userId: 1, status: 1, expiresAt: 1 });
bookingHoldSchema.index({ userId: 1, holdGroupId: 1 });

module.exports = mongoose.model('BookingHold', bookingHoldSchema);
