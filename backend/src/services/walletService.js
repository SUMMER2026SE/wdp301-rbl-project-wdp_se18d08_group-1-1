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
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = await Wallet.create({ userId });
  }

  return wallet;
};

/**
 * Get wallet balance
 * @param {string} userId - User's ObjectId
 * @returns {Object} { balance, totalTopUp, totalSpent, totalRefunded }
 */
const getBalance = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance: wallet.balance,
    totalTopUp: wallet.totalTopUp,
    totalSpent: wallet.totalSpent,
    totalRefunded: wallet.totalRefunded,
    status: wallet.status,
  };
};

/**
 * Credit wallet (add money) - Used for TOP_UP and REFUND
 * Uses MongoDB transactions for atomicity
 * @param {string} userId - User's ObjectId
 * @param {number} amount - Amount to add (VNĐ)
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
    const wallet = await getOrCreateWallet(userId);

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
          payosOrderCode: options.payosOrderCode || null,
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
 * @param {number} amount - Amount to subtract (VNĐ)
 * @param {string} description - Transaction description
 * @param {Object} [options] - Additional options
 * @param {string} [options.refSource] - Reference source (e.g., 'parking', 'booking')
 * @param {string} [options.refSourceId] - Reference source ID
 * @returns {Object} { transaction, wallet }
 */
const debitWallet = async (userId, amount, description, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId);

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

  // Use creditWallet to atomically update balance
  const result = await creditWallet(
    transaction.userId,
    transaction.amount,
    'TOP_UP',
    transaction.description,
    {
      payosOrderCode,
      payosPaymentLinkId: transaction.payosPaymentLinkId,
      payosReference,
    }
  );

  // Mark the original pending transaction as completed
  transaction.status = 'COMPLETED';
  transaction.balanceAfter = result.newBalance;
  transaction.payosReference = payosReference;
  await transaction.save();

  // Remove the duplicate completed transaction created by creditWallet
  // since we already have the original pending one updated
  await WalletTransaction.findByIdAndDelete(result.transaction._id);

  return {
    transaction,
    newBalance: result.newBalance,
    alreadyProcessed: false,
  };
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
