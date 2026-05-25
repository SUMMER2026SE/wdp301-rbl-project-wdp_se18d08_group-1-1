const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['refresh', 'reset_password', 'email_verification'],
      required: true,
    },
    tokenValue: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: automatically delete expired tokens
userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for fast lookup
userTokenSchema.index({ userId: 1, type: 1 });

const UserToken = mongoose.model('UserToken', userTokenSchema);

module.exports = UserToken;
