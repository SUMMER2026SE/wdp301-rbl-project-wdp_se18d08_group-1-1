const mongoose = require('mongoose');

const staffBookingActionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      required: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    evidenceImageUrl: {
      type: String,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

staffBookingActionSchema.index(
  { staffId: 1, idempotencyKey: 1 },
  { unique: true }
);

module.exports = mongoose.model('StaffBookingAction', staffBookingActionSchema);
