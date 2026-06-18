const mongoose = require("mongoose");

const packageTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package type name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Package type name must be at least 3 characters"],
      maxlength: [50, "Package type name must be 50 characters or less"],
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
