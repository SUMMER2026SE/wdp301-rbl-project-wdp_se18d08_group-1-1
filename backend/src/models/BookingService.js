const mongoose = require('mongoose');

const bookingServiceSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    timeCost: {
      type: Number,
      default: 30,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

bookingServiceSchema.index({ bookingId: 1, serviceId: 1 }, { unique: true });

module.exports = mongoose.model('BookingService', bookingServiceSchema);
