const Contract = require('../models/Contract');

const buildDateMatch = ({ startDate, endDate } = {}) => {
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);
  return Object.keys(createdAt).length ? { createdAt } : {};
};

async function getStatistics(filters = {}) {
  const match = buildDateMatch(filters);
  const [byStatus, byType, monthlyRevenue, topCustomers, activationRows, total] = await Promise.all([
    Contract.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Contract.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Contract.aggregate([
      { $match: { ...match, status: { $in: ['ACTIVE', 'EXPIRED', 'TRANSFERRED'] } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Contract.aggregate([
      { $match: match },
      { $group: { _id: '$userId', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', count: 1, amount: 1, user: { username: 1, email: 1 } } },
    ]),
    Contract.aggregate([
      { $match: { ...match, activatedAt: { $ne: null } } },
      { $project: { duration: { $subtract: ['$activatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$duration' } } },
    ]),
    Contract.countDocuments(match),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
  const typeCounts = Object.fromEntries(byType.map((row) => [row._id, row.count]));
  const cancelled = statusCounts.CANCELLED || 0;

  return {
    total,
    byStatus: statusCounts,
    byType: typeCounts,
    monthlyRevenue: monthlyRevenue.map((row) => ({ year: row._id.year, month: row._id.month, amount: row.amount, count: row.count })),
    cancellationRate: total ? (cancelled / total) * 100 : 0,
    averageActivationHours: activationRows[0]?.avgMs ? activationRows[0].avgMs / 3600000 : 0,
    topCustomers,
  };
}

module.exports = { getStatistics };
