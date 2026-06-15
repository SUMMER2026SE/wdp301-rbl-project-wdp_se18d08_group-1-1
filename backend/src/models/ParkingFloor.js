const mongoose = require("mongoose");

const parkingFloorSchema = new mongoose.Schema(
  {
    floorNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: function() {
        return `Floor ${this.floorNumber}`;
      }
    },
    layoutData: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        width: 1000,
        height: 600,
        elements: []
      }
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ParkingFloor", parkingFloorSchema);
