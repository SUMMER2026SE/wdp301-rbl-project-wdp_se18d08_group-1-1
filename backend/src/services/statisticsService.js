const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');
const WalletTransaction = require('../models/WalletTransaction');

const DAY_MS = 24 * 60 * 60 * 1000;
const BOOKING_SOURCES = ['booking', 'booking_order'];
const PAID_BOOKING_STATUSES = ['PAID', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED', 'CANCELLED'];

const startOfUtcMonth = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const resolveDateRange = (filters = {}, now = new Date()) => {
  const range = filters.range || '30d';
  let startDate = null;
  let endDate = new Date(now);

  if (filters.startDate || filters.endDate) {
    startDate = filters.startDate ? new Date(filters.startDate) : null;
    endDate = filters.endDate ? new Date(filters.endDate) : endDate;
  } else if (range === '7d') {
    startDate = new Date(now.getTime() - 7 * DAY_MS);
  } else if (range === '30d') {
    startDate = new Date(now.getTime() - 30 * DAY_MS);
  } else if (range === 'month') {
    startDate = startOfUtcMonth(now);
  } else if (range !== 'all') {
    throw Object.assign(new Error('Unsupported statistics range'), { statusCode: 400 });
  }

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw Object.assign(new Error('Invalid startDate'), { statusCode: 400 });
  }
  if (Number.isNaN(endDate.getTime())) {
    throw Object.assign(new Error('Invalid endDate'), { statusCode: 400 });
  }
  if (startDate && startDate > endDate) {
    throw Object.assign(new Error('startDate must be before endDate'), { statusCode: 400 });
  }
  if (startDate && endDate.getTime() - startDate.getTime() > 366 * DAY_MS) {
    throw Object.assign(new Error('Custom statistics range cannot exceed 366 days'), { statusCode: 400 });
  }

  return { startDate, endDate };
};

const buildCreatedAtMatch = ({ startDate, endDate }) => {
  const createdAt = { $lte: endDate };
  if (startDate) createdAt.$gte = startDate;
  return { createdAt };
};

const getTimelineBucket = (filters, period) => {
  const periodLength = period.startDate
    ? period.endDate.getTime() - period.startDate.getTime()
    : null;
  const useMonthlyBuckets =
    filters.range === 'all' || (periodLength !== null && periodLength > 90 * DAY_MS);
  return {
    granularity: useMonthlyBuckets ? 'month' : 'day',
    format: useMonthlyBuckets ? '%Y-%m' : '%Y-%m-%d',
  };
};

const timelineDateExpression = (format, dateField = '$createdAt') => ({
  $dateToString: {
    date: dateField,
    format,
    timezone: 'Asia/Ho_Chi_Minh',
  },
});

const zeroBookingSummary = () => ({
  totalBookings: 0,
  completedBookings: 0,
  activeBookings: 0,
  cancelledBookings: 0,
  expiredBookings: 0,
  completionRate: 0,
  scheduledHours: 0,
  bookingValue: 0,
});

const normalizeBookingSummary = (row) => {
  if (!row) return zeroBookingSummary();
  const terminal = Number(row.completedBookings || 0) +
    Number(row.cancelledBookings || 0) +
    Number(row.expiredBookings || 0);
  return {
    totalBookings: Number(row.totalBookings || 0),
    completedBookings: Number(row.completedBookings || 0),
    activeBookings: Number(row.activeBookings || 0),
    cancelledBookings: Number(row.cancelledBookings || 0),
    expiredBookings: Number(row.expiredBookings || 0),
    completionRate: terminal
      ? Math.round((Number(row.completedBookings || 0) / terminal) * 1000) / 10
      : 0,
    scheduledHours: Math.round(Number(row.scheduledHours || 0) * 10) / 10,
    bookingValue: Number(row.bookingValue || 0),
  };
};

const bookingSummaryPipeline = (match) => [
  { $match: match },
  {
    $group: {
      _id: null,
      totalBookings: { $sum: 1 },
      completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      activeBookings: {
        $sum: { $cond: [{ $in: ['$status', ['PAID', 'ACTIVE', 'PAUSED']] }, 1, 0] },
      },
      cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
      expiredBookings: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } },
      scheduledHours: { $sum: { $ifNull: ['$durationHours', 0] } },
      bookingValue: {
        $sum: {
          $cond: [
            { $in: ['$status', PAID_BOOKING_STATUSES] },
            { $ifNull: ['$prepaidAmount', 0] },
            0,
          ],
        },
      },
    },
  },
];

const walletBookingSummary = async (match) => {
  const rows = await WalletTransaction.aggregate([
    {
      $match: {
        ...match,
        status: 'COMPLETED',
        refSource: { $in: BOOKING_SOURCES },
        type: { $in: ['PAYMENT', 'REFUND'] },
      },
    },
    {
      $group: {
        _id: '$type',
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const byType = Object.fromEntries(rows.map((row) => [row._id, row]));
  const charges = Number(byType.PAYMENT?.amount || 0);
  const refunds = Number(byType.REFUND?.amount || 0);
  return {
    walletBookingCharges: charges,
    walletBookingRefunds: refunds,
    walletNetBookingSpend: charges - refunds,
    walletChargeCount: Number(byType.PAYMENT?.count || 0),
    walletRefundCount: Number(byType.REFUND?.count || 0),
  };
};

const getCustomerBookingStatistics = async (userId, filters = {}) => {
  const period = resolveDateRange(filters);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const createdAtMatch = buildCreatedAtMatch(period);
  const bookingMatch = { userId: userObjectId, ...createdAtMatch };
  const walletMatch = { userId: userObjectId, ...createdAtMatch };

  const [bookingRows, wallet, externalRows] = await Promise.all([
    Booking.aggregate(bookingSummaryPipeline(bookingMatch)),
    walletBookingSummary(walletMatch),
    Booking.aggregate([
      {
        $match: {
          ...bookingMatch,
          paymentMethod: 'vietqr',
          status: { $in: PAID_BOOKING_STATUSES },
        },
      },
      { $group: { _id: null, amount: { $sum: '$prepaidAmount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    period,
    operational: normalizeBookingSummary(bookingRows[0]),
    money: {
      ...wallet,
      externalPaymentValue: Number(externalRows[0]?.amount || 0),
      externalPaymentCount: Number(externalRows[0]?.count || 0),
      financialCoverage: 'partial',
      accurateSince: null,
      note: 'Wallet totals are source-filtered. Historical PayOS totals are derived from booking records.',
    },
  };
};

const getAdminBookingStatistics = async (filters = {}) => {
  const period = resolveDateRange(filters);
  const createdAtMatch = buildCreatedAtMatch(period);
  const timelineBucket = getTimelineBucket(filters, period);
  const [bookingRows, wallet, byStatus, byPaymentMethod, timelineRows] = await Promise.all([
    Booking.aggregate(bookingSummaryPipeline(createdAtMatch)),
    walletBookingSummary(createdAtMatch),
    Booking.aggregate([
      { $match: createdAtMatch },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$prepaidAmount' } } },
      { $sort: { count: -1 } },
    ]),
    Booking.aggregate([
      { $match: createdAtMatch },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, value: { $sum: '$prepaidAmount' } } },
      { $sort: { count: -1 } },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          ...createdAtMatch,
          status: 'COMPLETED',
          refSource: { $in: BOOKING_SOURCES },
          type: { $in: ['PAYMENT', 'REFUND'] },
        },
      },
      {
        $group: {
          _id: {
            period: timelineDateExpression(timelineBucket.format),
            type: '$type',
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]),
  ]);

  const timelineMap = new Map();
  for (const row of timelineRows) {
    const current = timelineMap.get(row._id.period) || {
      period: row._id.period,
      bookingCharges: 0,
      bookingRefunds: 0,
    };
    if (row._id.type === 'PAYMENT') current.bookingCharges = Number(row.amount || 0);
    if (row._id.type === 'REFUND') current.bookingRefunds = Number(row.amount || 0);
    timelineMap.set(row._id.period, current);
  }

  return {
    period,
    operational: normalizeBookingSummary(bookingRows[0]),
    money: {
      ...wallet,
      financialCoverage: 'partial',
      accurateSince: null,
    },
    byStatus: byStatus.map((row) => ({
      status: row._id || 'UNKNOWN',
      count: row.count,
      value: row.value || 0,
    })),
    byPaymentMethod: byPaymentMethod.map((row) => ({
      paymentMethod: row._id || 'unknown',
      count: row.count,
      value: row.value || 0,
    })),
    timeline: {
      granularity: timelineBucket.granularity,
      points: [...timelineMap.values()],
    },
  };
};

const getAdminSubscriptionStatistics = async (filters = {}) => {
  const period = resolveDateRange(filters);
  const createdAtMatch = buildCreatedAtMatch(period);
  const timelineBucket = getTimelineBucket(filters, period);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * DAY_MS);

  const [
    periodSummaryRows,
    currentStatusRows,
    packageRows,
    renewals,
    purchaseTimelineRows,
    renewalTimelineRows,
    expiringCount,
    activeSlotRows,
  ] = await Promise.all([
    Subscription.aggregate([
      { $match: createdAtMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] },
          },
        },
      },
    ]),
    Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Subscription.aggregate([
      { $match: { ...createdAtMatch, paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$ticketPackage',
          sold: { $sum: 1 },
          amount: { $sum: '$amount' },
          slots: { $sum: { $size: { $ifNull: ['$slots', []] } } },
        },
      },
      {
        $lookup: {
          from: 'ticketpackages',
          localField: '_id',
          foreignField: '_id',
          as: 'package',
        },
      },
      { $unwind: { path: '$package', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          packageId: '$_id',
          packageName: '$package.name',
          packageType: '$package.type',
          sold: 1,
          amount: 1,
          slots: 1,
        },
      },
      { $sort: { amount: -1 } },
    ]),
    SubscriptionRenewal.aggregate([
      { $match: { ...createdAtMatch, status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { ...createdAtMatch, paymentStatus: 'paid' } },
      {
        $group: {
          _id: timelineDateExpression(timelineBucket.format),
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubscriptionRenewal.aggregate([
      { $match: { ...createdAtMatch, status: 'paid' } },
      {
        $group: {
          _id: timelineDateExpression(
            timelineBucket.format,
            { $ifNull: ['$paidAt', '$createdAt'] }
          ),
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Subscription.countDocuments({
      status: 'active',
      paymentStatus: 'paid',
      expireAt: { $gt: now, $lte: sevenDaysFromNow },
    }),
    Subscription.aggregate([
      { $match: { status: 'active', paymentStatus: 'paid', expireAt: { $gt: now } } },
      {
        $group: {
          _id: null,
          activeSubscriptions: { $sum: 1 },
          reservedSlots: { $sum: { $size: { $ifNull: ['$slots', []] } } },
        },
      },
    ]),
  ]);

  const currentStatus = Object.fromEntries(
    currentStatusRows.map((row) => [row._id, row])
  );
  const sold = periodSummaryRows.reduce((sum, row) => sum + row.count, 0);
  const grossAmount = periodSummaryRows.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const renewalCount = Number(renewals[0]?.count || 0);
  const eligibleRenewals = Number(currentStatus.expired?.count || 0) + renewalCount;
  const timelineMap = new Map();
  for (const row of purchaseTimelineRows) {
    timelineMap.set(row._id, {
      period: row._id,
      packageSales: Number(row.amount || 0),
      renewalSales: 0,
    });
  }
  for (const row of renewalTimelineRows) {
    const current = timelineMap.get(row._id) || {
      period: row._id,
      packageSales: 0,
      renewalSales: 0,
    };
    current.renewalSales = Number(row.amount || 0);
    timelineMap.set(row._id, current);
  }

  return {
    period,
    summary: {
      sold,
      active: Number(currentStatus.active?.count || 0),
      pending: Number(currentStatus.pending?.count || 0),
      expired: Number(currentStatus.expired?.count || 0),
      cancelled: Number(currentStatus.cancelled?.count || 0),
      failed: Number(currentStatus.failed?.count || 0),
      expiringWithin7Days: expiringCount,
      grossAmount,
      renewalCount,
      renewalAmount: Number(renewals[0]?.amount || 0),
      renewalRate: eligibleRenewals
        ? Math.round((renewalCount / eligibleRenewals) * 1000) / 10
        : 0,
      activeReservedSlots: Number(activeSlotRows[0]?.reservedSlots || 0),
      averageSlotsPerActiveSubscription: Number(activeSlotRows[0]?.activeSubscriptions || 0)
        ? Math.round(
          (Number(activeSlotRows[0]?.reservedSlots || 0) /
            Number(activeSlotRows[0]?.activeSubscriptions || 1)) * 10
        ) / 10
        : 0,
    },
    byPackage: packageRows,
    timeline: {
      granularity: timelineBucket.granularity,
      points: [...timelineMap.values()].sort((left, right) =>
        left.period.localeCompare(right.period)
      ),
    },
    financialCoverage: renewalCount ? 'partial' : 'partial',
  };
};

module.exports = {
  getCustomerBookingStatistics,
  getAdminBookingStatistics,
  getAdminSubscriptionStatistics,
  _private: {
    resolveDateRange,
    normalizeBookingSummary,
    buildCreatedAtMatch,
    getTimelineBucket,
  },
};
