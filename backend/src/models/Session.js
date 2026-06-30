const mongoose = require('mongoose');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

const sessionSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      enum: ['kiosk', 'app_booking', 'booking', 'walk_in'],
      default: 'kiosk',
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    vehicleType: {
      type: String,
      enum: ['car', 'electric_car', 'motorcycle'], // Added motorcycle just in case
      default: 'car',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    parkingSlot: {
      type: String,
      trim: true,
      default: null,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingFloor',
      default: null,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    expectedDurationHours: {
      type: Number,
      default: 1,
    },
    entryImage_url: {
      type: String,
      default: null,
    },
    exitImage_url: {
      type: String,
      default: null,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    prepaidAmount: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    exitRequestedAt: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'cash', 'payos', 'none'],
      default: 'none',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    ticketPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketPackage',
      default: null,
    },
  },
  { timestamps: true }
);

sessionSchema.pre('validate', function normalizePlate(next) {
  if (this.licensePlate) {
    this.licensePlate = normalizeLicensePlate(this.licensePlate);
  }
  next();
});

sessionSchema.index({ licensePlate: 1, status: 1, checkInTime: 1 });

module.exports = mongoose.model('Session', sessionSchema);
