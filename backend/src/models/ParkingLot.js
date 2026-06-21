const mongoose = require("mongoose");

const parkingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    totalSlots: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ParkingLot", parkingLotSchema);
