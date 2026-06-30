const OPENING_FEE = 10000;
const DAY_RATE = 10000;
const NIGHT_RATE = 15000;
const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 22;
const PRICE_CAPS = [
  { maxHours: 6, amount: 50000 },
  { maxHours: 12, amount: 100000 },
  { maxHours: 24, amount: 180000 },
];

const roundUpToThousand = (value) => Math.ceil(Number(value || 0) / 1000) * 1000;

const getNextRateBoundary = (date) => {
  const next = new Date(date);
  const hour = date.getHours();

  if (hour < DAY_START_HOUR) {
    next.setHours(DAY_START_HOUR, 0, 0, 0);
    return next;
  }

  if (hour < NIGHT_START_HOUR) {
    next.setHours(NIGHT_START_HOUR, 0, 0, 0);
    return next;
  }

  next.setDate(next.getDate() + 1);
  next.setHours(DAY_START_HOUR, 0, 0, 0);
  return next;
};

const isDaytime = (date) => {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;
};

const getCapForHours = (durationHours) => {
  const cap = PRICE_CAPS.find((item) => durationHours <= item.maxHours);
  return cap || PRICE_CAPS[PRICE_CAPS.length - 1];
};

const calculateBookingPrice = (startTime, endTime, options = {}) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw Object.assign(new Error('Invalid pricing time range'), { statusCode: 400 });
  }

  let cursor = new Date(start);
  let dayMinutes = 0;
  let nightMinutes = 0;

  while (cursor < end) {
    const boundary = getNextRateBoundary(cursor);
    const segmentEnd = boundary < end ? boundary : end;
    const minutes = Math.max(0, (segmentEnd.getTime() - cursor.getTime()) / 60000);

    if (isDaytime(cursor)) {
      dayMinutes += minutes;
    } else {
      nightMinutes += minutes;
    }

    cursor = segmentEnd;
  }

  const durationMinutes = Math.ceil((end.getTime() - start.getTime()) / 60000);
  const paidHours = Math.max(1, Math.ceil(durationMinutes / 60));
  const rawUsageAmount = (dayMinutes / 60) * DAY_RATE + (nightMinutes / 60) * NIGHT_RATE;
  const usageBeforeCap = roundUpToThousand(rawUsageAmount);
  const cap = getCapForHours(paidHours);
  const usageAmount = Math.min(usageBeforeCap, cap.amount);
  const openingFee = options.waiveOpeningFee ? 0 : OPENING_FEE;

  return {
    openingFee,
    dayRate: DAY_RATE,
    nightRate: NIGHT_RATE,
    dayMinutes: Math.round(dayMinutes),
    nightMinutes: Math.round(nightMinutes),
    durationMinutes,
    paidHours,
    usageBeforeCap,
    capHours: cap.maxHours,
    capAmount: cap.amount,
    capApplied: usageAmount < usageBeforeCap,
    usageAmount,
    totalAmount: openingFee + usageAmount,
  };
};

module.exports = {
  OPENING_FEE,
  DAY_RATE,
  NIGHT_RATE,
  PRICE_CAPS,
  calculateBookingPrice,
};
