const mongoose = require("mongoose");

const parkingFloorSchema = new mongoose.Schema(
  {
    parkingLotID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      // required: true, // We will keep it optional for backwards compatibility during dev, but typically should be true
    },
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
