const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    zoneID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true, // As requested, every slot MUST belong to a zone
    },
    floorID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingFloor",
      required: true, // Keeping this for fast querying as discussed
    },
    slotNumber: {
      type: String,
      required: true,
      trim: true,
    },
    slotType: {
      type: String,
      default: "hourly",
    },
    gridX: {
      type: Number,
      required: true,
    },
    gridY: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "booked"],
      default: "available",
    },
    reservedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reservedBySubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    reservedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure slotNumber is unique within a zone or floor
slotSchema.index({ floorID: 1, slotNumber: 1 }, { unique: true });
slotSchema.index({ reservedBySubscriptionId: 1 });

module.exports = mongoose.model("Slot", slotSchema);
