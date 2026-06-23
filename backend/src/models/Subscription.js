const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketPackage',
      required: true,
    },
    slots: [
      {
        floorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ParkingFloor',
          required: true,
        },
        slotCode: {
          type: String,
          required: true,
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'failed'],
      default: 'pending',
    },
    orderCode: {
      type: Number,
      required: true, // PayOS order code
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    expireAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
