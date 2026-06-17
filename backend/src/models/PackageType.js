const mongoose = require("mongoose");

const packageTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package type name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Package type name is too short"],
      maxlength: [80, "Package type name is too long"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      required: [true, "Package type icon is required"],
      trim: true,
      default: "Ticket",
    },
    pricingMode: {
      type: String,
      enum: ["Hourly", "Monthly", "Fixed Fee"],
      required: [true, "Pricing mode is required"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PackageType", packageTypeSchema);
