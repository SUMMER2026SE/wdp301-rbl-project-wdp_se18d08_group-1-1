const mongoose = require('mongoose');

const ticketPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['hourly', 'daily', 'monthly', 'yearly'],
      required: true,
      default: 'hourly',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxSlots: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    renewalWindowDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 60,
    },
    isRenewable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TicketPackage', ticketPackageSchema);
