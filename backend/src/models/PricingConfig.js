const mongoose = require('mongoose');

const pricingConfigSchema = new mongoose.Schema(
  {
    sessionFee: {
      type: Number,
      required: true,
      default: 10000,
    },
    dayRate: {
      type: Number,
      required: true,
      default: 10000,
    },
    nightRate: {
      type: Number,
      required: true,
      default: 15000,
    },
    cap6hDay: {
      type: Number,
      required: true,
      default: 50000,
    },
    cap6hNight: {
      type: Number,
      required: true,
      default: 75000,
    },
    cap12h: {
      type: Number,
      required: true,
      default: 100000,
    },
    cap24h: {
      type: Number,
      required: true,
      default: 180000,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingConfig', pricingConfigSchema);
