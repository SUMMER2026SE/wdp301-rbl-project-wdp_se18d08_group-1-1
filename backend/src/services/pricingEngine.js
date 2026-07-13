const PricingConfig = require('../models/PricingConfig');

// Mức giá dự phòng (Fallback) nếu DB trống
const DEFAULT_CONFIG = {
  sessionFee: 10000,
  dayRate: 10000,
  nightRate: 15000,
  cap6hDay: 50000,
  cap6hNight: 75000,
  cap12h: 100000,
  cap24h: 180000,
};

/**
 * Lấy cấu hình giá mới nhất từ database
 */
async function getActivePricingConfig() {
  try {
    const config = await PricingConfig.findOne({ isActive: true }).sort({ createdAt: -1 });
    return config || DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Tính số phút ban ngày và ban đêm trong khoảng thời gian thực tế
 */
function getDayNightMinutes(checkIn, checkOut) {
  let dayMinutes = 0;
  let nightMinutes = 0;
  
  let current = new Date(checkIn);
  const end = new Date(checkOut);
  
  while (current < end) {
    const hour = current.getHours();
    if (hour >= 6 && hour < 22) {
      dayMinutes++;
    } else {
      nightMinutes++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }
  
  return { dayMinutes, nightMinutes };
}

/**
 * Tính toán phí đỗ xe thực tế dựa vào check-in/out
 * @param {Date} checkIn
 * @param {Date} checkOut
 * @param {Boolean} includeSessionFee
 * @param {Object} [config]
 */
async function calculatePrice(checkIn, checkOut, includeSessionFee = true, config = null) {
  if (!config) {
    config = await getActivePricingConfig();
  }

  const { dayMinutes, nightMinutes } = getDayNightMinutes(checkIn, checkOut);
  const totalMinutes = dayMinutes + nightMinutes;
  
  // Làm tròn lên theo giờ (1h20p -> 2h)
  const totalHours = Math.ceil(totalMinutes / 60) || 1;
  
  // Phân bổ tỷ lệ số giờ Ngày/Đêm tương đương số phút
  let dayHours = 0;
  let nightHours = 0;
  if (totalMinutes > 0) {
    dayHours = Math.round(totalHours * (dayMinutes / totalMinutes));
    nightHours = totalHours - dayHours;
  } else {
    dayHours = totalHours;
  }

  const sessionFee = includeSessionFee ? config.sessionFee : 0;
  const dayAmount = dayHours * config.dayRate;
  const nightAmount = nightHours * config.nightRate;
  const rawTotal = sessionFee + dayAmount + nightAmount;
  
  let capApplied = 'NONE';
  let finalTotal = rawTotal;
  
  // Áp dụng trần giá
  if (totalHours <= 6) {
    const cap6h = nightMinutes > dayMinutes ? config.cap6hNight : config.cap6hDay;
    const adjustedCap = cap6h + (includeSessionFee ? 0 : -config.sessionFee);
    if (rawTotal > adjustedCap) {
      finalTotal = adjustedCap;
      capApplied = nightMinutes > dayMinutes ? 'CAP_6H_NIGHT' : 'CAP_6H_DAY';
    }
  } else if (totalHours <= 12) {
    if (rawTotal > config.cap12h) {
      finalTotal = config.cap12h;
      capApplied = 'CAP_12H';
    }
  } else if (totalHours <= 24) {
    if (rawTotal > config.cap24h) {
      finalTotal = config.cap24h;
      capApplied = 'CAP_24H';
    }
  } else {
    // Vượt quá 24h: Tính trần 24h cho mỗi chu kỳ 24h + phần thừa tính lẻ không kèm phí mở phiên
    const fullDays = Math.floor(totalHours / 24);
    const remainderHours = totalHours % 24;
    
    let remainderPrice = 0;
    if (remainderHours > 0) {
      const remainderStart = new Date(checkIn.getTime() + fullDays * 24 * 60 * 60 * 1000);
      const res = await calculatePrice(remainderStart, checkOut, false, config);
      remainderPrice = res.finalTotal;
    }
    
    finalTotal = fullDays * config.cap24h + remainderPrice;
    capApplied = 'CAP_MULTI_DAY';
  }
  
  return {
    durationHours: totalHours,
    dayMinutes,
    nightMinutes,
    dayHours,
    nightHours,
    sessionFee,
    dayAmount,
    nightAmount,
    rawTotal,
    capApplied,
    finalTotal,
  };
}

module.exports = { calculatePrice, getActivePricingConfig };
