const mongoose = require('mongoose');

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
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
      default: null,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
