const DEFAULT_CONFIG = {
  timeBlocks: [
    { startHour: 7, endHour: 12, price: 10000 },
    { startHour: 12, endHour: 17, price: 10000 },
    { startHour: 17, endHour: 22, price: 20000 },
    { startHour: 22, endHour: 7, price: 25000 }
  ],
  cap12h: 100000,
  cap24h: 180000
};

export const calculateBookingPrice = (startTime, endTime, options = {}) => {
  const config = options.config || DEFAULT_CONFIG;
  const blocks = config.timeBlocks || DEFAULT_CONFIG.timeBlocks;
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return {
      usageAmount: 0,
      totalAmount: 0,
      paidHours: 0,
      capApplied: false,
    };
  }

  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);
  startOfDay.setDate(startOfDay.getDate() - 1);

  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  let rawTotal = 0;

  for (let d = new Date(startOfDay); d <= endOfDay; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();

    for (const block of blocks) {
      let blockStart = new Date(year, month, date, block.startHour, 0, 0, 0);
      let blockEnd = new Date(year, month, date, block.endHour, 0, 0, 0);

      if (block.endHour <= block.startHour) {
        blockEnd.setDate(blockEnd.getDate() + 1);
      }

      if (start < blockEnd && end > blockStart) {
        rawTotal += block.price;
      }
    }
  }

  const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  let finalTotal = rawTotal;
  let capApplied = false;

  if (durationHours <= 12 && rawTotal > config.cap12h) {
    finalTotal = config.cap12h;
    capApplied = true;
  } else if (durationHours <= 24 && rawTotal > config.cap24h) {
    finalTotal = config.cap24h;
    capApplied = true;
  } else if (durationHours > 24) {
    const fullDays = Math.floor(durationHours / 24);
    const maxAllowed = fullDays * config.cap24h + config.cap24h;
    if (rawTotal > maxAllowed) {
      finalTotal = maxAllowed;
      capApplied = true;
    }
  }

  return {
    usageAmount: finalTotal,
    totalAmount: options.waiveOpeningFee ? 0 : finalTotal,
    durationMinutes: Math.ceil((end.getTime() - start.getTime()) / 60000),
    paidHours: durationHours,
    capApplied,
  };
};
