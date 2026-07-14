const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Wallet Service - Business logic layer
 * Can be reused by other services (e.g., Booking API for refunds)
 */

/**
 * Get or create wallet for a user
 * @param {string} userId - User's ObjectId
 * @returns {Object} Wallet document
 */
const getOrCreateWallet = async (userId, options = {}) => {
  const { session } = options;
  let query = Wallet.findOne({ userId });
  if (session) query = query.session(session);
  let wallet = await query;

  if (!wallet) {
    if (session) {
      const created = await Wallet.create([{ userId }], { session });
      wallet = created[0];
    } else {
      wallet = await Wallet.create({ userId });
    }
  }

  return wallet;
};

/**
 * Get wallet balance
 * @param {string} userId - User's ObjectId
 * @returns {Object} { balance, totalTopUp, totalSpent, totalRefunded, totalTransactions, totalParkingPayments }
 */
const getBalance = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [lifetimeAgg, monthlyAgg] = await Promise.all([
    WalletTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'COMPLETED' } },
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'COMPLETED',
          createdAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const toSummary = (rows) =>
    rows.reduce(
      (acc, row) => {
        acc[row._id] = { amount: row.amount || 0, count: row.count || 0 };
        return acc;
      },
      {}
    );

  const lifetime = toSummary(lifetimeAgg);
  const monthly = toSummary(monthlyAgg);

  const [totalTransactions, totalParkingPayments] = await Promise.all([
    WalletTransaction.countDocuments({ userId }),
    WalletTransaction.countDocuments({ userId, type: 'PAYMENT', status: 'COMPLETED' }),
  ]);

  return {
    balance: wallet.balance,
    totalTopUp: lifetime.TOP_UP?.amount || wallet.totalTopUp,
    totalSpent: lifetime.PAYMENT?.amount || wallet.totalSpent,
    totalRefunded: lifetime.REFUND?.amount || wallet.totalRefunded,
    monthlyTopUp: monthly.TOP_UP?.amount || 0,
    monthlySpent: monthly.PAYMENT?.amount || 0,
    monthlyRefunded: monthly.REFUND?.amount || 0,
    monthlyParkingPayments: monthly.PAYMENT?.count || 0,
    totalTransactions,
    totalParkingPayments,
    status: wallet.status,
    overdraftLimit: -100000,
  };
};

/**
 * Credit wallet (add money) - Used for TOP_UP and REFUND
 * Uses MongoDB transactions for atomicity
 * @param {string} userId - User's ObjectId
 * @param {number} amount - Amount to add (VND)
 * @param {string} type - 'TOP_UP' or 'REFUND'
 * @param {string} description - Transaction description
 * @param {Object} [options] - Additional options
 * @param {string} [options.refSource] - Reference source (e.g., 'booking')
 * @param {string} [options.refSourceId] - Reference source ID
 * @param {number} [options.payosOrderCode] - payOS order code (for TOP_UP)
 * @param {string} [options.payosPaymentLinkId] - payOS payment link ID
 * @param {string} [options.payosReference] - payOS bank reference
 * @returns {Object} { transaction, wallet }
 */
const creditWallet = async (userId, amount, type, description, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId, { session });

    // Check wallet status
    if (wallet.status === 'frozen') {
      throw Object.assign(new Error('Wallet is frozen'), { statusCode: 403 });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Create transaction record
    const transaction = await WalletTransaction.create(
      [
        {
          userId,
          walletId: wallet._id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description,
          ...(options.payosOrderCode != null
            ? { payosOrderCode: options.payosOrderCode }
            : {}),
          payosPaymentLinkId: options.payosPaymentLinkId || null,
          payosReference: options.payosReference || null,
          refSource: options.refSource || null,
          refSourceId: options.refSourceId || null,
        },
      ],
      { session }
    );

    // Update wallet balance and totals
    const updateFields = { balance: balanceAfter };
    if (type === 'TOP_UP') {
      updateFields.totalTopUp = wallet.totalTopUp + amount;
    } else if (type === 'REFUND') {
      updateFields.totalRefunded = wallet.totalRefunded + amount;
    }

    await Wallet.findByIdAndUpdate(wallet._id, updateFields, { session });

    await session.commitTransaction();

    return {
      transaction: transaction[0],
      newBalance: balanceAfter,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Debit wallet (subtract money) - Used for PAYMENT
 * Uses MongoDB transactions for atomicity
 * @param {string} userId - User's ObjectId
 * @param {number} amount - Amount to subtract (VND)
 * @param {string} description - Transaction description
 * @param {Object} [options] - Additional options
 * @param {string} [options.refSource] - Reference source (e.g., 'parking', 'booking')
 * @param {string} [options.refSourceId] - Reference source ID
 * @returns {Object} { transaction, wallet }
 */
const debitWallet = async (userId, amount, description, options = {}) => {
  const externalSession = options.session || null;
  const session = externalSession || await mongoose.startSession();
  const ownsSession = !externalSession;

  if (ownsSession) {
    session.startTransaction();
  }

  try {
    const wallet = await getOrCreateWallet(userId, { session });

    // Check wallet status
    if (wallet.status === 'frozen') {
      throw Object.assign(new Error('Wallet is frozen'), { statusCode: 403 });
    }

    // Check sufficient balance
    const limit = options.allowNegative ? -100000 : 0;
    if (wallet.balance - amount < limit) {
      throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 400 });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    // Create transaction record
    const transaction = await WalletTransaction.create(
      [
        {
          userId,
          walletId: wallet._id,
          type: 'PAYMENT',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description,
          refSource: options.refSource || null,
          refSourceId: options.refSourceId || null,
        },
      ],
      { session }
    );

    // Update wallet balance and totalSpent
    await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        balance: balanceAfter,
        totalSpent: wallet.totalSpent + amount,
      },
      { session }
    );

    if (ownsSession) {
      await session.commitTransaction();
    }

    return {
      transaction: transaction[0],
      newBalance: balanceAfter,
    };
  } catch (error) {
    if (ownsSession) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (ownsSession) {
      session.endSession();
    }
  }
};

/**
 * Create a pending top-up transaction (before payOS payment)
 * @param {string} userId - User's ObjectId
 * @param {number} amount - Amount to top up
 * @param {number} payosOrderCode - Unique payOS order code
 * @param {string} payosPaymentLinkId - payOS payment link ID
 * @param {string} payosCheckoutUrl - payOS checkout URL
 * @param {string} description - Transaction description
 * @returns {Object} WalletTransaction document
 */
const createPendingTopUp = async (userId, amount, payosOrderCode, payosPaymentLinkId, payosCheckoutUrl, description) => {
  const wallet = await getOrCreateWallet(userId);

  // Check wallet status
  if (wallet.status === 'frozen') {
    throw Object.assign(new Error('Wallet is frozen'), { statusCode: 403 });
  }

  const transaction = await WalletTransaction.create({
    userId,
    walletId: wallet._id,
    type: 'TOP_UP',
    amount,
    balanceBefore: wallet.balance,
    balanceAfter: wallet.balance, // Not yet credited
    status: 'PENDING',
    description,
    payosOrderCode,
    payosPaymentLinkId,
    payosCheckoutUrl,
  });

  return transaction;
};

/**
 * Complete a pending top-up after payOS confirms payment
 * @param {number} payosOrderCode - payOS order code
 * @param {string} payosReference - Bank transaction reference
 * @returns {Object} { transaction, newBalance }
 */
const completePendingTopUp = async (payosOrderCode, payosReference) => {
  const transaction = await WalletTransaction.findOne({
    payosOrderCode,
    type: 'TOP_UP',
  });

  if (!transaction) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });
  }

  // Idempotency: if already completed, return existing data
  if (transaction.status === 'COMPLETED') {
    const wallet = await Wallet.findById(transaction.walletId);
    return {
      transaction,
      newBalance: wallet.balance,
      alreadyProcessed: true,
    };
  }

  if (transaction.status !== 'PENDING') {
    throw Object.assign(new Error('Transaction is not in PENDING status'), { statusCode: 400 });
  }

  // Use MongoDB transaction to atomically update wallet + transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findById(transaction.walletId).session(session);
    if (!wallet) {
      throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
    }

    const newBalance = wallet.balance + transaction.amount;

    // Update wallet balance and totalTopUp
    await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        balance: newBalance,
        totalTopUp: wallet.totalTopUp + transaction.amount,
      },
      { session }
    );

    // Update the pending transaction to completed
    transaction.status = 'COMPLETED';
    transaction.balanceAfter = newBalance;
    transaction.payosReference = payosReference || null;
    await transaction.save({ session });

    await session.commitTransaction();

    return {
      transaction,
      newBalance,
      alreadyProcessed: false,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel a pending top-up
 * @param {number} payosOrderCode - payOS order code
 * @returns {Object} Updated transaction
 */
const cancelPendingTopUp = async (payosOrderCode) => {
  const transaction = await WalletTransaction.findOneAndUpdate(
    { payosOrderCode, status: 'PENDING' },
    { status: 'CANCELLED' },
    { new: true }
  );

  return transaction;
};

/**
 * Get transaction history with pagination and filters
 * @param {string} userId - User's ObjectId
 * @param {Object} filters - { page, limit, type, status }
 * @returns {Object} { transactions, pagination }
 */
const getTransactionHistory = async (userId, filters = {}) => {
  const { page = 1, limit = 10, type, status } = filters;

  const query = { userId };
  if (type) query.type = type;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    WalletTransaction.countDocuments(query),
  ]);

  return {
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getOrCreateWallet,
  getBalance,
  creditWallet,
  debitWallet,
  createPendingTopUp,
  completePendingTopUp,
  cancelPendingTopUp,
  getTransactionHistory,
};
