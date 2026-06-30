const mongoose = require('mongoose');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

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
      enum: ['confirmed', 'active', 'paused', 'completed', 'cancelled', 'expired'],
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
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingOrder',
      default: null,
    },
    orderItemIndex: {
      type: Number,
      default: null,
      min: 0,
    },
    clientItemId: {
      type: String,
      trim: true,
      default: '',
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
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingHold',
      default: null,
    },
    ticketPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketPackage',
      default: null,
    },
    pricingDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    remainingMinutes: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  { timestamps: true }
);

bookingSchema.pre('validate', function validateBookingTime(next) {
  if (this.licensePlate) {
    this.licensePlate = normalizeLicensePlate(this.licensePlate);
  }
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error('Booking endTime must be after startTime'));
  }
  return next();
});

bookingSchema.index({ floorId: 1, slotCode: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ licensePlate: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ orderId: 1, orderItemIndex: 1 });
bookingSchema.index({ userId: 1, orderId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
