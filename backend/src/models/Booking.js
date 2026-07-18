const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: false,
    },
    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingFloor',
      required: true,
    },
    parkingSlot: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
    },
    prepaidAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'vietqr'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    modificationCount: {
      type: Number,
      default: 0,
    },
    vietqrOrderCode: {
      type: Number,
      sparse: true,
    },
    vietqrPaymentLinkId: {
      type: String,
      default: null,
    },
    slotChangesHistory: [
      {
        oldSlot: { type: String, required: true },
        newSlot: { type: String, required: true },
        reason: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      }
    ],
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ vehicleId: 1, scheduledStart: 1, scheduledEnd: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
