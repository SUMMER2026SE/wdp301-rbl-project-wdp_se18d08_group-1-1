const mongoose = require("mongoose");

const ticketPackageSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Package code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^PKG-\d{3}$/, "Package code must use PKG-XXX format"],
    },
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      minlength: [3, "Package name must be at least 3 characters"],
      maxlength: [80, "Package name must be 80 characters or less"],
    },
    packageTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PackageType",
      required: [true, "Package type is required"],
    },
    packageTypeName: {
      type: String,
      required: [true, "Package type name is required"],
      trim: true,
    },
    appliesTo: {
      type: String,
      enum: ["Guest", "Customer", "All"],
      required: [true, "Applies to is required"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
    pricingMode: {
      type: String,
      enum: ["Hourly", "Monthly", "Fixed Fee"],
      required: [true, "Pricing mode is required"],
    },
    firstBlockPrice: { type: Number, default: 0, min: 0 },
    firstBlockDuration: { type: Number, default: 0, min: 0 },
    nextBlockPrice: { type: Number, default: 0, min: 0 },
    nextBlockDuration: { type: Number, default: 0, min: 0 },
    basePrice: { type: Number, default: 0, min: 0 },
    duration: { type: Number, default: 0, min: 0 },
    durationDays: { type: Number, default: 0, min: 0 },
    monthlyPrice: { type: Number, default: 0, min: 0 },
    vehicleLimit: { type: Number, default: 1, min: 0 },
    overtimeFee: { type: Number, default: 0, min: 0 },
    noShowFee: { type: Number, default: 0, min: 0 },
    feeAmount: { type: Number, default: 0, min: 0 },
    feeType: { type: String, trim: true, default: "" },
    feeDescription: { type: String, trim: true, default: "" },
    fixedSlotEnabled: { type: Boolean, default: false },
    unlimitedEntryEnabled: { type: Boolean, default: false },
    icon: { type: String, trim: true, default: "Ticket" },
    flowSteps: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TicketPackage", ticketPackageSchema);
