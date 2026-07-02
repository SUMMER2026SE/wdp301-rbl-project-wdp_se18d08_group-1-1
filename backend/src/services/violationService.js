const mongoose = require('mongoose');
const Violation = require('../models/Violation');
const User = require('../models/User');
const UserDetail = require('../models/UserDetail');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const walletService = require('./walletService');
const revenueService = require('./revenueService');
const notificationTriggers = require('./notificationTriggers');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const error = (message, statusCode = 400, extra = {}) => Object.assign(new Error(message), { statusCode, ...extra });

const buildDateFilter = ({ startDate, endDate } = {}) => {
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const addComputedFields = (violation) => {
  if (!violation) return violation;
  const createdAt = violation.createdAt ? new Date(violation.createdAt) : null;
  const isPending = violation.status === 'PENDING' && createdAt && !Number.isNaN(createdAt.getTime());
  const paymentWindow = 72 * 60 * 60 * 1000;
  const remaining = isPending ? paymentWindow - (Date.now() - createdAt.getTime()) : 0;

  return {
    ...violation,
    isOverdue: isPending ? Date.now() - createdAt.getTime() > paymentWindow : false,
    daysLeftInPaymentWindow: remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0,
  };
};

const basePopulate = (query, role) => {
  query.populate('vehicleId', 'licensePlate vehicleType brand model color owner');
  query.populate('bookingId', 'slotCode licensePlate startTime endTime status');
  query.populate('parkingSessionId', 'licensePlate parkingSlot status checkInTime checkOutTime');
  query.populate('walletTransactionId', 'type amount status balanceBefore balanceAfter refSource createdAt');

  if (role === 'staff' || role === 'admin') {
    query.populate('userId', 'username email role');
    query.populate('createdBy', 'username email role');
  }

  return query;
};

const validateReferences = async ({ userId, vehicleId, bookingId, parkingSessionId }) => {
  const [user, vehicle, booking, parkingSession] = await Promise.all([
    User.findById(userId).lean(),
    Vehicle.findById(vehicleId).lean(),
    bookingId ? Booking.findById(bookingId).lean() : null,
    parkingSessionId ? Session.findById(parkingSessionId).lean() : null,
  ]);

  if (!user) throw error('User not found', 404);
  if (!vehicle) throw error('Vehicle not found', 404);
  if (String(vehicle.owner) !== String(userId)) {
    throw error('Vehicle does not belong to the selected user', 400);
  }
  if (bookingId && !booking) throw error('Booking not found', 404);
  if (parkingSessionId && !parkingSession) throw error('Parking session not found', 404);
};

const createViolation = async (data, createdBy, app = null) => {
  await validateReferences(data);

  const violation = await Violation.create({
    userId: data.userId,
    vehicleId: data.vehicleId,
    title: data.title,
    description: data.description || '',
    fineAmount: data.fineAmount,
    createdBy,
    bookingId: data.bookingId || null,
    parkingSessionId: data.parkingSessionId || null,
    evidenceImages: data.evidenceImages || [],
  });

  notificationTriggers
    .notifyViolationCreated(app, violation.userId, {
      violationId: violation._id,
      title: violation.title,
      amount: violation.fineAmount,
    })
    .catch((err) => console.error('Failed to send violation notification:', err.message));

  return Violation.findById(violation._id)
    .populate('vehicleId', 'licensePlate vehicleType brand model color owner')
    .populate('userId', 'username email role')
    .populate('createdBy', 'username email role');
};

const payViolation = async (violationId, userId, app = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const violation = await Violation.findOneAndUpdate(
      { _id: violationId, status: 'PENDING' },
      { $set: { updatedAt: new Date() } },
      { new: true, session }
    );
    if (!violation) {
      const existingViolation = await Violation.findById(violationId).session(session);
      if (!existingViolation) throw error('Violation not found', 404);
      if (existingViolation.status === 'PAID') throw error('Vi phạm này đã được thanh toán', 400);
      if (existingViolation.status === 'CANCELLED') throw error('Vi phạm này đã bị hủy', 400);
      throw error(`Violation is already ${existingViolation.status.toLowerCase()}`, 400);
    }
    if (String(violation.userId) !== String(userId)) {
      console.warn(`[Violation] Forbidden payment attempt: user=${userId} violation=${violationId}`);
      throw error('Forbidden: You do not have permission to perform this action', 403);
    }
    if (violation.status !== 'PENDING') {
      if (violation.status === 'PAID') throw error('Vi phạm này đã được thanh toán', 400);
      if (violation.status === 'CANCELLED') throw error('Vi phạm này đã bị hủy', 400);
      throw error(`Violation is already ${violation.status.toLowerCase()}`, 400);
    }

    const { transaction, newBalance } = await walletService.debitWallet(
      userId,
      violation.fineAmount,
      `Violation fine payment ${violation._id}`,
      {
        refSource: 'violation',
        refSourceId: violation._id,
        session,
      }
    );

    violation.status = 'PAID';
    violation.paidAt = new Date();
    violation.walletTransactionId = transaction._id;
    await violation.save({ session });

    const revenue = await revenueService.recordViolationRevenue(
      {
        violationId: violation._id,
        userId: violation.userId,
        amount: violation.fineAmount,
        createdBy: violation.createdBy,
        walletTransactionId: transaction._id,
      },
      { session }
    );

    await session.commitTransaction();

    notificationTriggers
      .notifyViolationPaid(app, violation.userId, violation._id, violation.fineAmount)
      .catch((err) => console.error('Failed to send violation paid notification:', err.message));

    return {
      violation: await Violation.findById(violation._id)
        .populate('vehicleId', 'licensePlate vehicleType brand model color owner')
        .populate('walletTransactionId', 'type amount status balanceBefore balanceAfter refSource createdAt'),
      walletTransaction: transaction,
      revenue,
      newBalance,
    };
  } catch (err) {
    await session.abortTransaction();
    if (err.statusCode) throw err;

    console.error('[Violation] Payment transaction failed:', err);
    throw error('Payment processing failed. Please try again.', 500, {
      code: 'VIOLATION_PAYMENT_TRANSACTION_FAILED',
    });
  } finally {
    session.endSession();
  }
};

const cancelViolation = async (violationId, app = null) => {
  const violation = await Violation.findById(violationId);
  if (!violation) throw error('Violation not found', 404);
  if (violation.status === 'PAID') throw error('Không thể hủy vi phạm đã thanh toán', 400);
  if (violation.status === 'CANCELLED') throw error('Vi phạm này đã bị hủy', 400);

  violation.status = 'CANCELLED';
  await violation.save();

  notificationTriggers
    .notifyViolationCancelled(app, violation.userId, violation._id)
    .catch((err) => console.error('Failed to send violation cancelled notification:', err.message));

  return basePopulate(Violation.findById(violation._id), 'admin');
};

const getSearchUserIds = async (search) => {
  if (!search) return [];
  const regex = new RegExp(search, 'i');
  const [users, details] = await Promise.all([
    User.find({ $or: [{ email: regex }, { username: regex }] }).select('_id').lean(),
    UserDetail.find({ phone: regex }).select('userId').lean(),
  ]);

  return [
    ...users.map((user) => user._id),
    ...details.map((detail) => detail.userId),
  ];
};

const buildViolationQuery = async (filters = {}, role, requestUserId) => {
  const query = {
    ...buildDateFilter(filters),
  };

  if (filters.status) query.status = filters.status;
  if (filters.vehicleId) query.vehicleId = filters.vehicleId;
  if (role === 'customer') {
    query.userId = requestUserId;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    const vehicles = await Vehicle.find({ licensePlate: regex }).select('_id').lean();
    const userIds = await getSearchUserIds(filters.search);
    query.$or = [
      { title: regex },
      { vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) } },
      { userId: { $in: userIds } },
    ];
  }

  return query;
};

const getViolations = async (filters = {}, role, requestUserId) => {
  const page = Math.max(parseInt(filters.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || 20, 10), 1), 100);
  const skip = (page - 1) * limit;
  const query = await buildViolationQuery(filters, role, requestUserId);

  const [violations, total] = await Promise.all([
    basePopulate(Violation.find(query), role)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Violation.countDocuments(query),
  ]);

  return {
    violations: violations.map(addComputedFields),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getViolationById = async (violationId, role, requestUserId) => {
  const query = { _id: violationId };
  if (role === 'customer') query.userId = requestUserId;

  const violation = await basePopulate(Violation.findOne(query), role).lean({ virtuals: true });
  if (!violation) throw error('Violation not found', 404);
  return addComputedFields(violation);
};

const getUserViolationHistory = async (userId) => {
  const violations = await basePopulate(Violation.find({ userId }), 'admin')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  const summary = violations.reduce(
    (acc, violation) => {
      acc.total += 1;
      acc.totalFineAmount += violation.fineAmount || 0;
      const key = String(violation.status || '').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      if (violation.status === 'PAID' && violation.paidAt && violation.createdAt) {
        acc._paymentDurations.push(new Date(violation.paidAt).getTime() - new Date(violation.createdAt).getTime());
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0, cancelled: 0, totalFineAmount: 0, _paymentDurations: [] }
  );

  const totalDuration = summary._paymentDurations.reduce((total, value) => total + value, 0);
  summary.avgPaymentTimeHours = summary._paymentDurations.length
    ? totalDuration / summary._paymentDurations.length / 3600000
    : 0;
  summary.repeatOffenderWarning = summary.pending > 5;
  delete summary._paymentDurations;

  return {
    violations: violations.map(addComputedFields),
    summary,
  };
};

const getViolationStatistics = async (filters = {}) => {
  const match = buildDateFilter(filters);
  const paidMatch = { status: 'PAID', paidAt: { $ne: null }, ...buildDateFilter(filters) };

  const [statusCounts, topTypes, topOffenders, monthlyRevenue] = await Promise.all([
    Violation.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, totalFineAmount: { $sum: '$fineAmount' } } },
    ]),
    Violation.aggregate([
      { $match: match },
      { $group: { _id: '$title', count: { $sum: 1 }, totalFineAmount: { $sum: '$fineAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Violation.aggregate([
      { $match: match },
      { $group: { _id: '$userId', count: { $sum: 1 }, totalFineAmount: { $sum: '$fineAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', count: 1, totalFineAmount: 1, user: { username: 1, email: 1 } } },
    ]),
    Violation.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          amount: { $sum: '$fineAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const countsByStatus = { PENDING: 0, PAID: 0, CANCELLED: 0 };
  let total = 0;
  let totalFineAmount = 0;

  statusCounts.forEach((row) => {
    countsByStatus[row._id] = row.count;
    total += row.count;
    totalFineAmount += row.totalFineAmount || 0;
  });

  return {
    total,
    countsByStatus,
    totalFineAmount,
    paymentRate: total ? (countsByStatus.PAID / total) * 100 : 0,
    topViolationTypes: topTypes.map((row) => ({
      title: row._id,
      count: row.count,
      totalFineAmount: row.totalFineAmount,
    })),
    topOffenders,
    monthlyRevenue: monthlyRevenue.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      amount: row.amount,
      count: row.count,
    })),
  };
};

module.exports = {
  createViolation,
  payViolation,
  cancelViolation,
  getViolations,
  getViolationById,
  getUserViolationHistory,
  getViolationStatistics,
};
