const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

const createDateError = (message) =>
  Object.assign(new Error(message), { statusCode: 400 });

const parseVietnamCalendarDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) throw createDateError('date must use YYYY-MM-DD format');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const startDate = new Date(Date.UTC(year, month - 1, day) - VIETNAM_OFFSET_MS);
  const localDate = new Date(startDate.getTime() + VIETNAM_OFFSET_MS);

  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) {
    throw createDateError('date must be a valid calendar date');
  }

  return startDate;
};

const startOfVietnamDay = (date) => {
  const localDate = new Date(date.getTime() + VIETNAM_OFFSET_MS);
  return new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate()
    ) - VIETNAM_OFFSET_MS
  );
};

const resolveVietnamCalendarDay = (dateValue, now = new Date()) => {
  const startDate = dateValue
    ? parseVietnamCalendarDate(dateValue)
    : startOfVietnamDay(now);

  return {
    startDate,
    endDate: new Date(startDate.getTime() + DAY_MS - 1),
  };
};

const buildBookingDayOverlapMatch = ({ startDate, endDate }) => ({
  $or: [
    { scheduledStart: { $gte: startDate, $lte: endDate } },
    { scheduledEnd: { $gte: startDate, $lte: endDate } },
    {
      scheduledStart: { $lte: startDate },
      scheduledEnd: { $gte: endDate },
    },
  ],
});

module.exports = {
  DAY_MS,
  VIETNAM_OFFSET_MS,
  parseVietnamCalendarDate,
  startOfVietnamDay,
  resolveVietnamCalendarDay,
  buildBookingDayOverlapMatch,
};
