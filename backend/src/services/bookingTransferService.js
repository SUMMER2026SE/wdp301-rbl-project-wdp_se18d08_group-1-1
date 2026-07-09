const mongoose = require('mongoose');
const BookingTransfer = require('../models/BookingTransfer');
const Booking = require('../models/Booking');
const Contract = require('../models/Contract');
const User = require('../models/User');
const contractService = require('./contractService');

const error = (message, statusCode = 400, extra = {}) => Object.assign(new Error(message), { statusCode, ...extra });
const getBookingEnd = (booking) => booking.scheduledEnd || booking.endTime;
const isTransferableBookingStatus = (status) => ['PAID', 'ACTIVE', 'PAUSED', 'confirmed', 'active'].includes(status);

const populateTransfer = (query) => query
  .populate('fromUserId', 'username email role')
  .populate('toUserId', 'username email role')
  .populate('bookingId')
  .populate('approvedBy', 'username email role')
  .populate('originalContractId')
  .populate('transferContractId');

const getPagination = (filters = {}) => {
  const page = Math.max(parseInt(filters.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || 20, 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

async function validateBookingTransfer(bookingId, fromUserId, toUserId) {
  const booking = await Booking.findById(bookingId).populate('ticketPackageId');
  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (String(booking.userId) !== String(fromUserId)) {
    throw error('You are not the owner of this booking', 403);
  }

  if (!booking.ticketPackageId || !['monthly', 'yearly'].includes(booking.ticketPackageId.type)) {
    throw error('Only long-term bookings can be transferred', 400);
  }

  const bookingEnd = getBookingEnd(booking);
  if (!bookingEnd || new Date() > bookingEnd) {
    throw error('Cannot transfer expired booking', 400);
  }

  if (!isTransferableBookingStatus(booking.status)) {
    throw error('Only active or confirmed bookings can be transferred', 400);
  }

  if (String(fromUserId) === String(toUserId)) {
    throw error('Cannot transfer to yourself', 400);
  }

  const transferee = await User.findById(toUserId);
  if (!transferee) {
    throw error('Transferee not found', 400);
  }

  if (transferee.role !== 'customer') {
    throw error('Transferee must be a customer', 400);
  }

  if (!transferee.status) {
    throw error('Transferee account is inactive', 400);
  }

  return { booking, transferee };
}

async function createTransferRequest(data) {
  const { bookingId, fromUserId, toUserId, reason } = data;
  const { booking } = await validateBookingTransfer(bookingId, fromUserId, toUserId);

  const existingPendingTransfer = await BookingTransfer.findOne({
    bookingId,
    status: 'PENDING',
  }).lean();

  if (existingPendingTransfer) {
    throw error('This booking already has a pending transfer request', 409);
  }

  const originalContract = await Contract.findOne({
    bookingId,
    userId: fromUserId,
    status: 'ACTIVE',
  }).sort({ createdAt: -1 });

  const transferRequest = await BookingTransfer.create({
    fromUserId,
    toUserId,
    bookingId,
    reason,
    status: 'PENDING',
    originalContractId: originalContract?._id || null,
  });

  if (!originalContract) {
    const createdOriginalContract = await contractService.generateContract(bookingId);
    if (createdOriginalContract && createdOriginalContract.status === 'DRAFT' && booking.paymentStatus === 'paid') {
      await contractService.activateContract(createdOriginalContract._id);
    }

    transferRequest.originalContractId = createdOriginalContract?._id || null;
    await transferRequest.save();
  }

  return populateTransfer(BookingTransfer.findById(transferRequest._id));
}

async function approveAndCompleteTransfer(transferId, adminId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await BookingTransfer.findOneAndUpdate(
      { _id: transferId, status: 'PENDING' },
      {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      { new: true, session }
    );

    if (!transfer) {
      const existingTransfer = await BookingTransfer.findById(transferId).session(session);
      if (!existingTransfer) throw error('Transfer request not found', 404);
      throw error('Transfer request is not pending', 400);
    }

    const booking = await Booking.findById(transfer.bookingId).populate('ticketPackageId').session(session);
    if (!booking) {
      throw error('Booking not found', 404);
    }

    if (String(booking.userId) !== String(transfer.fromUserId)) {
      throw error('Booking owner has changed and can no longer be transferred', 400);
    }

    if (
      !booking.ticketPackageId ||
      !['monthly', 'yearly'].includes(booking.ticketPackageId.type) ||
      !isTransferableBookingStatus(booking.status) ||
      new Date() > getBookingEnd(booking)
    ) {
      throw error('Booking is no longer eligible for transfer', 400);
    }

    booking.userId = transfer.toUserId;
    await booking.save({ session });

    const transferContract = await contractService.createTransferContract({
      transfer,
      booking,
      originalContractId: transfer.originalContractId,
      session,
    });

    transfer.transferContractId = transferContract._id;
    transfer.status = 'COMPLETED';
    transfer.completedAt = new Date();
    await transfer.save({ session });

    await session.commitTransaction();

    return populateTransfer(BookingTransfer.findById(transfer._id));
  } catch (err) {
    await session.abortTransaction();
    if (err.statusCode) throw err;

    console.error('[BookingTransfer] Transaction failed:', err);
    throw error('Failed to complete transfer. Please try again or contact support.', 500, {
      code: 'BOOKING_TRANSFER_TRANSACTION_FAILED',
    });
  } finally {
    session.endSession();
  }
}

async function rejectTransferRequest(transferId, rejectionReason) {
  if (!rejectionReason || !String(rejectionReason).trim()) {
    throw error('Rejection reason is required', 400);
  }

  const transfer = await BookingTransfer.findOneAndUpdate(
    { _id: transferId, status: 'PENDING' },
    {
      status: 'REJECTED',
      rejectionReason: String(rejectionReason).trim(),
      rejectedAt: new Date(),
    },
    { new: true }
  );

  if (!transfer) {
    const existingTransfer = await BookingTransfer.findById(transferId);
    if (!existingTransfer) throw error('Transfer request not found', 404);
    throw error('Transfer request is not pending', 400);
  }

  return populateTransfer(BookingTransfer.findById(transfer._id));
}

async function getTransferHistory(userId, filters = {}) {
  const { page, limit, skip } = getPagination(filters);

  let query = {};
  if (filters.role === 'transferor') {
    query.fromUserId = userId;
  } else if (filters.role === 'transferee') {
    query.toUserId = userId;
  } else {
    query = { $or: [{ fromUserId: userId }, { toUserId: userId }] };
  }

  const [transfers, total] = await Promise.all([
    populateTransfer(BookingTransfer.find(query))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BookingTransfer.countDocuments(query),
  ]);

  return {
    transfers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getAllTransferRequests(filters = {}) {
  const { page, limit, skip } = getPagination(filters);
  const query = {};
  if (filters.status) query.status = filters.status;

  const [transfers, total] = await Promise.all([
    populateTransfer(BookingTransfer.find(query))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BookingTransfer.countDocuments(query),
  ]);

  return {
    transfers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  validateBookingTransfer,
  createTransferRequest,
  approveAndCompleteTransfer,
  rejectTransferRequest,
  getTransferHistory,
  getAllTransferRequests,
};
