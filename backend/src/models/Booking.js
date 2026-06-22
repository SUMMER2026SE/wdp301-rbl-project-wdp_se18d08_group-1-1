const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['confirmed', 'active', 'completed', 'cancelled', 'expired'],
      default: 'confirmed',
    },
    paidHours: {
      type: Number,
      required: true,
      min: 1,
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    prepaidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['wallet'],
      default: 'wallet',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partially_refunded', 'refunded', 'failed'],
      default: 'paid',
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    ticketPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketPackage',
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.pre('validate', function validateBookingTime(next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error('Booking endTime must be after startTime'));
  }
  return next();
});

bookingSchema.index({ floorId: 1, slotCode: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
