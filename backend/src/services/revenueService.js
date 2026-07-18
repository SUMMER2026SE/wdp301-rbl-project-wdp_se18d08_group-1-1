const Revenue = require('../models/Revenue');

const buildDateFilter = ({ startDate, endDate } = {}) => {
  const createdAt = {};

  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);

  return Object.keys(createdAt).length ? { createdAt } : {};
};

const recordViolationRevenue = async (data, options = {}) => {
  const { violationId, userId, amount, createdBy, walletTransactionId } = data;
  const payload = {
    type: 'VIOLATION',
    amount,
    sourceId: violationId,
    sourceModel: 'Violation',
    userId,
    createdBy: createdBy || null,
    metadata: {
      violationId,
      walletTransactionId: walletTransactionId || null,
    },
  };

  if (options.session) {
    const created = await Revenue.create([payload], { session: options.session });
    return created[0];
  }

  return Revenue.create(payload);
};

const getViolationRevenue = async (filters = {}) => {
  const page = Math.max(parseInt(filters.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || 20, 10), 1), 100);
  const skip = (page - 1) * limit;
  const query = {
    type: 'VIOLATION',
    ...buildDateFilter(filters),
  };

  const [revenues, total, aggregate] = await Promise.all([
    Revenue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sourceId')
      .populate('userId', 'username email role')
      .populate('createdBy', 'username email role')
      .lean(),
    Revenue.countDocuments(query),
    Revenue.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    revenues,
    summary: {
      totalAmount: aggregate[0]?.totalAmount || 0,
      count: aggregate[0]?.count || 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getRevenueStatistics = async (filters = {}) => {
  const match = {
    type: 'VIOLATION',
    ...buildDateFilter(filters),
  };

  const [summary, byMonth, byUser] = await Promise.all([
    Revenue.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
    ]),
    Revenue.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Revenue.aggregate([
      { $match: match },
      { $group: { _id: '$userId', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', amount: 1, count: 1, user: { username: 1, email: 1 } } },
    ]),
  ]);

  return {
    summary: {
      totalAmount: summary[0]?.totalAmount || 0,
      count: summary[0]?.count || 0,
      averageAmount: summary[0]?.averageAmount || 0,
    },
    byMonth: byMonth.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      amount: row.amount,
      count: row.count,
    })),
    topUsersByRevenue: byUser,
  };
};

module.exports = {
  recordViolationRevenue,
  getViolationRevenue,
  getRevenueStatistics,
};
