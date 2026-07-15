const mongoose = require('mongoose');

const timeBlockSchema = new mongoose.Schema({
  startHour: { type: Number, required: true }, // 0 to 23
  endHour: { type: Number, required: true }, // 0 to 24 (hoặc nhỏ hơn startHour nếu vắt qua ngày)
  price: { type: Number, required: true }
}, { _id: false });

const pricingConfigSchema = new mongoose.Schema(
  {
    timeBlocks: {
      type: [timeBlockSchema],
      required: true,
      default: [
        { startHour: 7, endHour: 12, price: 10000 },
        { startHour: 12, endHour: 17, price: 10000 },
        { startHour: 17, endHour: 22, price: 20000 },
        { startHour: 22, endHour: 7, price: 25000 }
      ]
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
