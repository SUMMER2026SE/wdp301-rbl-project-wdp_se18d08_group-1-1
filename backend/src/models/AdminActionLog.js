const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['create', 'update', 'delete', 'block'],
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

adminActionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
