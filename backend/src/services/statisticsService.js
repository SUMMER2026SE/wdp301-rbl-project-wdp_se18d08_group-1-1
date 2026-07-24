const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');
const MembershipEntitlementRenewal = require('../models/MembershipEntitlementRenewal');
const WalletTransaction = require('../models/WalletTransaction');
const {
  DAY_MS,
  VIETNAM_OFFSET_MS,
  parseVietnamCalendarDate,
  startOfVietnamDay,
  buildBookingDayOverlapMatch,
} = require('../utils/bookingDateRange');
const {
  getBookingFinancialSummaryMap,
} = require('./bookingFinancialService');
const BOOKING_SOURCES = ['booking', 'booking_order'];
const PAID_BOOKING_STATUSES = ['PAID', 'ACTIVE', 'PAUSED', 'EXPIRED', 'COMPLETED', 'CANCELLED'];

const startOfVietnamMonth = (date) => {
  const localDate = new Date(date.getTime() + VIETNAM_OFFSET_MS);
  return new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), 1) -
      VIETNAM_OFFSET_MS
  );
};

const resolveDateRange = (filters = {}, now = new Date()) => {
  const range = filters.range || '30d';
  let startDate = null;
  let endDate = new Date(now);

  if (filters.startDate || filters.endDate) {
    startDate = filters.startDate ? new Date(filters.startDate) : null;
    endDate = filters.endDate ? new Date(filters.endDate) : endDate;
  } else if (range === 'daily') {
    startDate = filters.date
      ? parseVietnamCalendarDate(filters.date)
      : startOfVietnamDay(now);
    endDate = new Date(startDate.getTime() + DAY_MS - 1);
  } else if (range === 'today') {
    startDate = startOfVietnamDay(now);
  } else if (range === '7d') {
    startDate = new Date(now.getTime() - 7 * DAY_MS);
  } else if (range === '30d') {
    startDate = new Date(now.getTime() - 30 * DAY_MS);
  } else if (range === 'month') {
    startDate = startOfVietnamMonth(now);
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

const buildBookingScheduleMatch = ({ startDate, endDate }, range) => {
  if (!startDate) return {};

  if (range === 'today' || range === 'daily') {
    return buildBookingDayOverlapMatch({
      startDate,
      endDate: new Date(startDate.getTime() + DAY_MS - 1),
    });
  }

  const scheduledStart = { $gte: startDate };
  scheduledStart.$lt = endDate;

  return { scheduledStart };
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

const normalizeCompletedBookingStatistics = (row) => ({
  count: Number(row?.count || 0),
  prepaidRevenue: Number(row?.prepaidRevenue || 0),
  additionalRevenue: Number(row?.additionalRevenue || 0),
  grossRevenue: Number(row?.grossRevenue || 0),
  refundPaid: Number(row?.refundPaid || 0),
  actualRevenue: Number(row?.actualRevenue || 0),
});

const buildLifecycleDateMatch = (field, fallbackField, period) => {
  if (!period.startDate) return {};
  const dateRange = { $gte: period.startDate, $lte: period.endDate };
  return {
    $or: [
      { [field]: dateRange },
      {
        [field]: null,
        [fallbackField]: dateRange,
      },
    ],
  };
};

const calculatePlatformBookingRevenue = (
  bookings,
  financialSummaries,
  completedServiceAmountByBooking = new Map()
) => bookings.reduce(
  (summary, booking) => {
    const bookingId = String(booking._id);
    const financial = financialSummaries.get(bookingId) || {
      prepaidCollected: 0,
      grossRevenue: 0,
      refundPaid: 0,
      actualRevenue: 0,
    };
    const grossRevenue = Math.max(
      0,
      Number(financial.grossRevenue) ||
        (Number(financial.actualRevenue) || 0) + (Number(financial.refundPaid) || 0)
    );
    const refundPaid = Math.min(
      grossRevenue,
      Math.max(0, Number(financial.refundPaid) || 0)
    );
    const snapshot = booking.paymentBreakdownSnapshot;
    const paidServiceAmount = Math.min(
      Math.max(0, Number(financial.prepaidCollected) || 0),
      Math.max(
        0,
        snapshot?.source
          ? Number(snapshot.serviceAmount) || 0
          : Number(completedServiceAmountByBooking.get(bookingId)) || 0
      )
    );
    const completedServiceAmount = Math.max(
      0,
      Number(completedServiceAmountByBooking.get(bookingId)) || 0
    );
    const grossServiceAmount = Math.min(
      paidServiceAmount,
      completedServiceAmount
    );
    const recordedServiceRefund = (booking.refundSettlements || []).reduce(
      (total, settlement) => settlement?.payoutStatus === 'credited'
        ? total + Math.max(0, Number(settlement.refundableServiceAmount) || 0)
        : total,
      0
    );
    const paidServiceRefund = Math.min(
      paidServiceAmount,
      refundPaid,
      recordedServiceRefund
    );
    const serviceRevenue = Math.max(
      0,
      grossServiceAmount - Math.min(grossServiceAmount, paidServiceRefund)
    );
    const grossBookingAmount = Math.max(0, grossRevenue - paidServiceAmount);
    const bookingRefund = Math.min(
      grossBookingAmount,
      Math.max(0, refundPaid - paidServiceRefund)
    );
    const bookingRevenue = Math.max(0, grossBookingAmount - bookingRefund);

    summary.bookingRevenue += bookingRevenue;
    summary.serviceRevenue += serviceRevenue;
    summary.completedBookingCount += 1;
    if (grossServiceAmount > 0) summary.serviceBookingCount += 1;
    return summary;
  },
  {
    bookingRevenue: 0,
    serviceRevenue: 0,
    completedBookingCount: 0,
    serviceBookingCount: 0,
  }
);

const aggregatePaidAmount = async (Model, match) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    amount: Number(rows[0]?.amount || 0),
    count: Number(rows[0]?.count || 0),
  };
};

const calculatePlatformRevenueTotal = ({
  vipRevenue = 0,
  bookingRevenue = 0,
  serviceRevenue = 0,
  membershipTransferFeeRevenue = 0,
}) =>
  Number(vipRevenue || 0) +
  Number(bookingRevenue || 0) +
  Number(serviceRevenue || 0) +
  Number(membershipTransferFeeRevenue || 0);

const getAdminPlatformRevenueStatistics = async (filters = {}) => {
  const period = resolveDateRange({ range: 'all', ...filters });
  const bookingDateMatch = buildLifecycleDateMatch(
    'completedAt',
    'updatedAt',
    period
  );
  const renewalDateMatch = buildLifecycleDateMatch('paidAt', 'createdAt', period);
  const subscriptionDateMatch = period.startDate
    ? buildCreatedAtMatch(period)
    : {};

  const [
    completedBookings,
    subscriptionPurchases,
    subscriptionRenewals,
    entitlementRenewals,
    membershipTransferFees,
  ] = await Promise.all([
    Booking.find({ status: 'COMPLETED', ...bookingDateMatch })
      .select(
        'prepaidAmount paymentBreakdownSnapshot paidOverageAdjustments refundSettlements completedAt updatedAt'
      )
      .lean(),
    aggregatePaidAmount(Subscription, {
      paymentStatus: 'paid',
      ...subscriptionDateMatch,
    }),
    aggregatePaidAmount(SubscriptionRenewal, {
      status: 'paid',
      ...renewalDateMatch,
    }),
    aggregatePaidAmount(MembershipEntitlementRenewal, {
      status: 'paid',
      ...renewalDateMatch,
    }),
    aggregatePaidAmount(WalletTransaction, {
      type: 'TRANSFER_FEE',
      status: 'COMPLETED',
      ...buildCreatedAtMatch(period),
    }),
  ]);

  const bookingIds = completedBookings.map((booking) => booking._id);
  const [financialSummaries, completedServiceRows] = await Promise.all([
    getBookingFinancialSummaryMap(completedBookings),
    bookingIds.length
      ? BookingService.aggregate([
        {
          $match: {
            bookingId: { $in: bookingIds },
            status: 'done',
          },
        },
        {
          $group: {
            _id: '$bookingId',
            amount: { $sum: '$price' },
          },
        },
      ])
      : [],
  ]);
  const completedServiceAmountByBooking = new Map(
    completedServiceRows.map((row) => [String(row._id), Number(row.amount) || 0])
  );
  const bookingRevenue = calculatePlatformBookingRevenue(
    completedBookings,
    financialSummaries,
    completedServiceAmountByBooking
  );
  const vipRevenue =
    subscriptionPurchases.amount +
    subscriptionRenewals.amount +
    entitlementRenewals.amount;
  const vipTransactionCount =
    subscriptionPurchases.count +
    subscriptionRenewals.count +
    entitlementRenewals.count;
  const totalRevenue = calculatePlatformRevenueTotal({
    vipRevenue,
    bookingRevenue: bookingRevenue.bookingRevenue,
    serviceRevenue: bookingRevenue.serviceRevenue,
    membershipTransferFeeRevenue: membershipTransferFees.amount,
  });

  return {
    period,
    currency: 'VND',
    basis: 'realized_completed_revenue',
    vip: {
      revenue: vipRevenue,
      transactionCount: vipTransactionCount,
      purchaseRevenue: subscriptionPurchases.amount,
      renewalRevenue:
        subscriptionRenewals.amount + entitlementRenewals.amount,
    },
    booking: {
      revenue: bookingRevenue.bookingRevenue,
      completedCount: bookingRevenue.completedBookingCount,
    },
    service: {
      revenue: bookingRevenue.serviceRevenue,
      completedBookingCount: bookingRevenue.serviceBookingCount,
    },
    membershipTransferFees: {
      revenue: membershipTransferFees.amount,
      transactionCount: membershipTransferFees.count,
    },
    totalRevenue,
  };
};

const getCompletedBookingStatistics = async (bookingMatch) => {
  const bookings = await Booking.find({
    status: 'COMPLETED',
    ...bookingMatch,
  })
    .select('prepaidAmount paidOverageAdjustments refundSettlements')
    .lean();
  const financialSummaries = await getBookingFinancialSummaryMap(bookings);

  return normalizeCompletedBookingStatistics(
    bookings.reduce(
      (summary, booking) => {
        const financial = financialSummaries.get(String(booking._id));
        summary.count += 1;
        summary.prepaidRevenue += financial.prepaidCollected;
        summary.additionalRevenue += financial.additionalCollected;
        summary.grossRevenue += financial.grossRevenue;
        summary.refundPaid += financial.refundPaid;
        summary.actualRevenue += financial.actualRevenue;
        return summary;
      },
      {
        count: 0,
        prepaidRevenue: 0,
        additionalRevenue: 0,
        grossRevenue: 0,
        refundPaid: 0,
        actualRevenue: 0,
      }
    )
  );
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
  const bookingScheduleMatch = buildBookingScheduleMatch(period, filters.range || '30d');
  const bookingScopeMatch = {
    ...bookingScheduleMatch,
    ...(filters.range !== 'all' && filters.floorId
      ? { floorId: new mongoose.Types.ObjectId(filters.floorId) }
      : {}),
  };
  const timelineBucket = getTimelineBucket(filters, period);
  const [
    bookingRows,
    wallet,
    completed,
    cancelledCount,
    availabilityRows,
    byStatus,
    byPaymentMethod,
    timelineRows,
  ] = await Promise.all([
    Booking.aggregate(bookingSummaryPipeline(bookingScopeMatch)),
    walletBookingSummary(createdAtMatch),
    getCompletedBookingStatistics(bookingScopeMatch),
    Booking.countDocuments({
      status: 'CANCELLED',
      ...bookingScopeMatch,
    }),
    Booking.aggregate([
      {
        $group: {
          _id: null,
          earliestBookingAt: { $min: '$scheduledStart' },
          latestBookingAt: { $max: '$scheduledStart' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: bookingScopeMatch },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$prepaidAmount' } } },
      { $sort: { count: -1 } },
    ]),
    Booking.aggregate([
      { $match: bookingScopeMatch },
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
    periodBasis: 'bookingSchedule',
    operational: normalizeBookingSummary(bookingRows[0]),
    completed,
    cancelled: {
      count: Number(cancelledCount || 0),
    },
    availability: {
      earliestBookingAt: availabilityRows[0]?.earliestBookingAt || null,
      latestBookingAt: availabilityRows[0]?.latestBookingAt || null,
    },
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
  getAdminPlatformRevenueStatistics,
  _private: {
    resolveDateRange,
    parseVietnamCalendarDate,
    normalizeBookingSummary,
    buildCreatedAtMatch,
    buildBookingScheduleMatch,
    getTimelineBucket,
    normalizeCompletedBookingStatistics,
    buildLifecycleDateMatch,
    calculatePlatformBookingRevenue,
    calculatePlatformRevenueTotal,
  },
};
