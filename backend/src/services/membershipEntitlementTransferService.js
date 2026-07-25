const crypto = require('crypto');
const mongoose = require('mongoose');
const MembershipEntitlementTransfer = require('../models/MembershipEntitlementTransfer');
const MembershipSlotEntitlement = require('../models/MembershipSlotEntitlement');
const Session = require('../models/Session');
const Slot = require('../models/Slot');
const User = require('../models/User');
const ParkingFloor = require('../models/ParkingFloor');
const TicketPackage = require('../models/TicketPackage');
const Vehicle = require('../models/Vehicle');
const walletService = require('./walletService');
const {
  buildTransferAgreementPdf,
  formatCurrency,
  formatDate,
} = require('./pdfService');
const { recomputeUserMembership } = require('./membershipProjectionService');

const OPEN_STATUSES = ['PENDING_RECIPIENT', 'PENDING_ADMIN', 'AWAITING_PAYMENT'];
const error = (message, statusCode = 400, code) =>
  Object.assign(new Error(message), { statusCode, code });
const floor1000 = (value) => Math.floor(Math.max(0, Number(value || 0)) / 1000) * 1000;

const calculateTransferPricing = (entitlement, askingPrice, now = new Date()) => {
  const validFrom = new Date(entitlement.validFrom);
  const expireAt = new Date(entitlement.expireAt);
  const totalTerm = Math.max(1, expireAt.getTime() - validFrom.getTime());
  const remainingTerm = Math.max(0, expireAt.getTime() - now.getTime());
  const remainingValue = floor1000(
    Number(entitlement.unitAmount || 0) * (remainingTerm / totalTerm)
  );
  const normalizedAskingPrice = floor1000(askingPrice);
  if (normalizedAskingPrice > remainingValue) {
    throw error(
      `Asking price cannot exceed remaining value ${remainingValue}.`,
      400,
      'ASKING_PRICE_TOO_HIGH'
    );
  }
  const transferFee = remainingValue * 0.05;
  return {
    askingPrice: normalizedAskingPrice,
    remainingValue,
    transferFee,
    totalDue: normalizedAskingPrice + transferFee,
    calculatedAt: now,
    validFrom,
    expireAt,
    unitAmount: Number(entitlement.unitAmount || 0),
  };
};

const populateTransfer = (query) =>
  query
    .populate('fromUserId', 'username email')
    .populate('toUserId', 'username email')
    .populate({
      path: 'entitlementId',
      populate: [
        {
          path: 'floorId',
          select: 'name floorNumber parkingLotID',
          populate: { path: 'parkingLotID', select: 'name address' },
        },
        { path: 'packageId', select: 'name type price' },
      ],
    })
    .populate('approvedBy', 'username email');

const assertNoActiveSession = async (entitlementId, session = null) => {
  let query = Session.findOne({
    entitlementId,
    status: 'active',
  }).select('_id');
  if (session) query = query.session(session);
  if (await query) {
    throw error(
      'The vehicle must be checked out before this space can be transferred.',
      409,
      'ACTIVE_SESSION_EXISTS'
    );
  }
};

const assertRecipientCapacity = async (userId, session = null) => {
  let vehicleQuery = Vehicle.countDocuments({ owner: userId, status: 'approved' });
  let entitlementQuery = MembershipSlotEntitlement.countDocuments({
    ownerId: userId,
    status: { $in: ['active', 'transfer_locked'] },
    expireAt: { $gt: new Date() },
  });
  if (session) {
    vehicleQuery = vehicleQuery.session(session);
    entitlementQuery = entitlementQuery.session(session);
  }
  const [vehicleCount, entitlementCount] = await Promise.all([
    vehicleQuery,
    entitlementQuery,
  ]);
  if (!vehicleCount || entitlementCount >= Math.min(3, vehicleCount)) {
    throw error(
      'Recipient needs an approved vehicle and available membership capacity.',
      409,
      'RECIPIENT_CAPACITY_EXCEEDED'
    );
  }
};

const createTransfer = async ({
  entitlementId,
  fromUserId,
  toUserId,
  toUserEmail,
  askingPrice,
  reason,
}) => {
  const entitlement = await MembershipSlotEntitlement.findOne({
    _id: entitlementId,
    ownerId: fromUserId,
    status: 'active',
    expireAt: { $gt: new Date() },
    transferCount: { $lt: 1 },
  });
  if (!entitlement) {
    throw error('This membership space cannot be transferred.', 404, 'NOT_TRANSFERABLE');
  }
  await assertNoActiveSession(entitlement._id);
  const recipient = await User.findOne(
    toUserId ? { _id: toUserId } : { email: String(toUserEmail || '').trim().toLowerCase() }
  ).select('role status username email');
  if (!recipient || recipient.role !== 'customer' || !recipient.status) {
    throw error('Active recipient account not found.', 404, 'RECIPIENT_NOT_FOUND');
  }
  if (String(recipient._id) === String(fromUserId)) {
    throw error('You cannot transfer a space to yourself.', 400, 'SELF_TRANSFER');
  }
  const pricing = calculateTransferPricing(entitlement, askingPrice);
  const transfer = await MembershipEntitlementTransfer.create({
    entitlementId: entitlement._id,
    fromUserId,
    toUserId: recipient._id,
    status: 'PENDING_RECIPIENT',
    reason,
    askingPrice: pricing.askingPrice,
    remainingValue: pricing.remainingValue,
    transferFee: pricing.transferFee,
    priceSnapshot: pricing,
  }).catch((cause) => {
    if (cause?.code === 11000) {
      throw error('This space already has an open transfer.', 409, 'TRANSFER_EXISTS');
    }
    throw cause;
  });
  return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
};

const acceptTransfer = async (transferId, userId) => {
  const transfer = await MembershipEntitlementTransfer.findOneAndUpdate(
    { _id: transferId, toUserId: userId, status: 'PENDING_RECIPIENT' },
    { $set: { status: 'PENDING_ADMIN', acceptedAt: new Date() } },
    { new: true }
  );
  if (!transfer) throw error('Transfer invitation is not available.', 409);
  return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
};

const rejectTransfer = async (transferId, userId, reason = '') => {
  const existing = await MembershipEntitlementTransfer.findOne({
    _id: transferId,
    status: { $in: ['PENDING_RECIPIENT', 'PENDING_ADMIN'] },
    $or: [{ toUserId: userId }, { fromUserId: userId }],
  }).select('fromUserId');
  if (!existing) throw error('Transfer cannot be cancelled or rejected.', 409);
  const nextStatus =
    String(userId) === String(existing.fromUserId) ? 'CANCELLED' : 'REJECTED';
  const transfer = await MembershipEntitlementTransfer.findOneAndUpdate(
    {
      _id: transferId,
      status: { $in: ['PENDING_RECIPIENT', 'PENDING_ADMIN'] },
      $or: [{ toUserId: userId }, { fromUserId: userId }],
    },
    {
      $set: {
        status: nextStatus,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: String(reason || '').trim(),
      },
    },
    { new: true }
  );
  if (!transfer) throw error('Transfer cannot be cancelled or rejected.', 409);
  return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
};

const approveTransfer = async (transferId, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await MembershipEntitlementTransfer.findOne({
      _id: transferId,
      status: 'PENDING_ADMIN',
    }).session(session);
    if (!transfer) throw error('Transfer is not awaiting admin approval.', 409);
    await assertRecipientCapacity(transfer.toUserId, session);
    await assertNoActiveSession(transfer.entitlementId, session);
    const lockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const entitlement = await MembershipSlotEntitlement.findOneAndUpdate(
      {
        _id: transfer.entitlementId,
        ownerId: transfer.fromUserId,
        status: 'active',
        transferCount: { $lt: 1 },
        expireAt: { $gt: new Date() },
      },
      { $set: { status: 'transfer_locked' } },
      { new: true, session }
    );
    if (!entitlement) throw error('Entitlement changed before approval.', 409);
    transfer.status = 'AWAITING_PAYMENT';
    transfer.approvedBy = adminId;
    transfer.approvedAt = new Date();
    transfer.lockExpiresAt = lockExpiresAt;
    await transfer.save({ session });
    await session.commitTransaction();
    return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
  } catch (cause) {
    await session.abortTransaction();
    throw cause;
  } finally {
    session.endSession();
  }
};

const rejectByAdmin = async (transferId, adminId, reason) => {
  const transfer = await MembershipEntitlementTransfer.findOneAndUpdate(
    { _id: transferId, status: 'PENDING_ADMIN' },
    {
      $set: {
        status: 'REJECTED',
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: String(reason || '').trim(),
      },
    },
    { new: true }
  );
  if (!transfer) throw error('Transfer is not awaiting admin review.', 409);
  return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
};

const settleTransfer = async (transferId, recipientId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await MembershipEntitlementTransfer.findOne({
      _id: transferId,
      toUserId: recipientId,
      status: 'AWAITING_PAYMENT',
      lockExpiresAt: { $gt: new Date() },
    }).session(session);
    if (!transfer) {
      throw error('Transfer payment window is closed.', 409, 'TRANSFER_LOCK_EXPIRED');
    }
    await assertRecipientCapacity(recipientId, session);
    await assertNoActiveSession(transfer.entitlementId, session);

    let recipientPayment = null;
    let senderCredit = null;
    if (transfer.askingPrice > 0) {
      recipientPayment = await walletService.debitWallet(
        recipientId,
        transfer.askingPrice,
        'Membership space transfer payment',
        {
          refSource: 'membership_transfer',
          refSourceId: transfer._id,
          idempotencyKey: `membership-transfer:${transfer._id}:price-out`,
          transactionType: 'TRANSFER_OUT',
          session,
        }
      );
      senderCredit = await walletService.creditWallet(
        transfer.fromUserId,
        transfer.askingPrice,
        'TRANSFER_IN',
        'Membership space transfer proceeds',
        {
          refSource: 'membership_transfer',
          refSourceId: transfer._id,
          idempotencyKey: `membership-transfer:${transfer._id}:price-in`,
          session,
        }
      );
    }
    let feePayment = null;
    if (transfer.transferFee > 0) {
      feePayment = await walletService.debitWallet(
        recipientId,
        transfer.transferFee,
        'Membership transfer processing fee',
        {
          refSource: 'membership_transfer',
          refSourceId: transfer._id,
          idempotencyKey: `membership-transfer:${transfer._id}:fee`,
          transactionType: 'TRANSFER_FEE',
          session,
        }
      );
    }
    const entitlement = await MembershipSlotEntitlement.findOneAndUpdate(
      {
        _id: transfer.entitlementId,
        ownerId: transfer.fromUserId,
        status: 'transfer_locked',
        transferCount: { $lt: 1 },
      },
      {
        $set: { ownerId: recipientId, status: 'active' },
        $inc: { transferCount: 1 },
      },
      { new: true, session }
    );
    if (!entitlement) throw error('Entitlement ownership changed.', 409);
    const slot = await Slot.findOneAndUpdate(
      {
        _id: entitlement.slotId,
        reservedByEntitlementId: entitlement._id,
        reservedFor: transfer.fromUserId,
      },
      { $set: { reservedFor: recipientId } },
      { new: true, session }
    );
    if (!slot) throw error('Reserved slot ownership changed.', 409);

    transfer.status = 'COMPLETED';
    transfer.completedAt = new Date();
    transfer.recipientWalletTransactionId = recipientPayment?.transaction?._id || null;
    transfer.senderWalletTransactionId = senderCredit?.transaction?._id || null;
    transfer.feeWalletTransactionId = feePayment?.transaction?._id || null;
    transfer.contractNumber = `MTR-${Date.now()}-${crypto.randomInt(1000, 10000)}`;
    const [fromUser, toUser, floor, ticketPackage] = await Promise.all([
      User.findById(transfer.fromUserId).select('username email').session(session).lean(),
      User.findById(recipientId).select('username email').session(session).lean(),
      ParkingFloor.findById(entitlement.floorId)
        .select('name floorNumber parkingLotID')
        .populate('parkingLotID', 'name address')
        .session(session)
        .lean(),
      TicketPackage.findById(entitlement.packageId).select('name type').session(session).lean(),
    ]);
    transfer.contractSnapshot = {
      contractNumber: transfer.contractNumber,
      entitlementId: entitlement._id,
      slotCode: entitlement.slotCode,
      floorId: entitlement.floorId,
      floor: floor
        ? { name: floor.name, floorNumber: floor.floorNumber }
        : null,
      parkingLot: floor?.parkingLotID
        ? { name: floor.parkingLotID.name, address: floor.parkingLotID.address }
        : null,
      package: ticketPackage
        ? { name: ticketPackage.name, type: ticketPackage.type }
        : null,
      fromUserId: transfer.fromUserId,
      toUserId: recipientId,
      fromUser: fromUser
        ? { username: fromUser.username, email: fromUser.email }
        : null,
      toUser: toUser
        ? { username: toUser.username, email: toUser.email }
        : null,
      reason: transfer.reason,
      askingPrice: transfer.askingPrice,
      transferFee: transfer.transferFee,
      totalDue: transfer.askingPrice + transfer.transferFee,
      paymentMethod: 'VALO Wallet',
      validFrom: entitlement.validFrom,
      expireAt: entitlement.expireAt,
      completedAt: transfer.completedAt,
    };
    await transfer.save({ session });
    await recomputeUserMembership(transfer.fromUserId, {
      session,
      rotateQr: true,
    });
    await recomputeUserMembership(recipientId, { session, rotateQr: true });
    await session.commitTransaction();
    return populateTransfer(MembershipEntitlementTransfer.findById(transfer._id));
  } catch (cause) {
    await session.abortTransaction();
    throw cause;
  } finally {
    session.endSession();
  }
};

const listTransfers = async (userId, role, filters = {}) => {
  const query = role === 'admin'
    ? {}
    : { $or: [{ fromUserId: userId }, { toUserId: userId }] };
  if (filters.status) query.status = filters.status;
  return populateTransfer(MembershipEntitlementTransfer.find(query))
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

const valueOrFallback = (snapshotValue, liveValue) =>
  snapshotValue === undefined || snapshotValue === null || snapshotValue === ''
    ? liveValue
    : snapshotValue;

const buildTransferContractData = (transfer) => {
  const snapshot = transfer.contractSnapshot || {};
  const entitlement = transfer.entitlementId || {};
  const floor = snapshot.floor || entitlement.floorId || {};
  const parkingLot = snapshot.parkingLot || floor.parkingLotID || {};
  const ticketPackage = snapshot.package || entitlement.packageId || {};
  const fromUser = snapshot.fromUser || transfer.fromUserId || {};
  const toUser = snapshot.toUser || transfer.toUserId || {};
  const completedAt = valueOrFallback(snapshot.completedAt, transfer.completedAt);
  const askingPrice = valueOrFallback(snapshot.askingPrice, transfer.askingPrice);
  const transferFee = valueOrFallback(snapshot.transferFee, transfer.transferFee);
  const totalDue = valueOrFallback(
    snapshot.totalDue,
    Number(askingPrice || 0) + Number(transferFee || 0)
  );
  return {
    contractNumber: valueOrFallback(snapshot.contractNumber, transfer.contractNumber),
    completedAt,
    packageName: ticketPackage.name || ticketPackage.type,
    fromUser,
    toUser,
    parkingLot,
    floorName: floor.name || (
      floor.floorNumber !== undefined ? `Tầng ${floor.floorNumber}` : null
    ),
    slotCode: valueOrFallback(snapshot.slotCode, entitlement.slotCode),
    validFrom: valueOrFallback(snapshot.validFrom, entitlement.validFrom),
    expireAt: valueOrFallback(snapshot.expireAt, entitlement.expireAt),
    askingPrice,
    transferFee,
    totalDue,
    paymentMethod: snapshot.paymentMethod || (
      transfer.feeWalletTransactionId ? 'VALO Wallet' : null
    ),
  };
};

const buildTransferContractLines = (transfer) => {
  const data = buildTransferContractData(transfer);
  const lines = [
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    'Độc lập – Tự do – Hạnh phúc',
    '',
    data.completedAt ? `Ngày ${formatDate(data.completedAt)}` : '',
    'HỢP ĐỒNG CHUYỂN NHƯỢNG QUYỀN SỬ DỤNG CHỖ ĐỖ XE',
    data.contractNumber
      ? `Số hợp đồng: ${data.contractNumber}`
      : '',
    data.packageName
      ? `Loại quyền: ${data.packageName}`
      : '',
    '',
    'BÊN CHUYỂN NHƯỢNG (BÊN A)',
    data.fromUser.username ? `Họ và tên/Tên tài khoản: ${data.fromUser.username}` : '',
    data.fromUser.email ? `Email: ${data.fromUser.email}` : '',
    '',
    'BÊN NHẬN CHUYỂN NHƯỢNG (BÊN B)',
    data.toUser.username ? `Họ và tên/Tên tài khoản: ${data.toUser.username}` : '',
    data.toUser.email ? `Email: ${data.toUser.email}` : '',
    '',
    'Hai bên tự nguyện thỏa thuận và đồng ý ký kết hợp đồng với các điều khoản sau:',
    '',
    'ĐIỀU 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG',
    data.parkingLot.name ? `Bãi đỗ xe: ${data.parkingLot.name}` : '',
    data.parkingLot.address ? `Vị trí bãi: ${data.parkingLot.address}` : '',
    data.floorName ? `Tầng: ${data.floorName}` : '',
    data.slotCode ? `Chỗ đỗ xe: ${data.slotCode}` : '',
    data.validFrom ? `Hiệu lực từ: ${formatDate(data.validFrom)}` : '',
    data.expireAt ? `Hiệu lực đến: ${formatDate(data.expireAt)}` : '',
    '',
    'ĐIỀU 2: GIÁ CHUYỂN NHƯỢNG VÀ THANH TOÁN',
    data.askingPrice !== undefined && data.askingPrice !== null
      ? `Giá chuyển nhượng: ${formatCurrency(data.askingPrice)}`
      : '',
    data.transferFee !== undefined && data.transferFee !== null
      ? `Phí xử lý: ${formatCurrency(data.transferFee)}`
      : '',
    data.totalDue !== undefined && data.totalDue !== null
      ? `Tổng thanh toán của Bên B: ${formatCurrency(data.totalDue)}`
      : '',
    data.paymentMethod
      ? `Phương thức thanh toán: ${data.paymentMethod}`
      : '',
    data.completedAt ? `Thanh toán hoàn tất: ${formatDate(data.completedAt)}` : '',
  ];

  return lines.filter((line, index) => line !== '' || lines[index - 1] !== '');
};

const generateTransferPdf = async (transferId, userId, role) => {
  const transfer = await populateTransfer(
    MembershipEntitlementTransfer.findById(transferId)
  ).lean();
  if (!transfer || transfer.status !== 'COMPLETED') {
    throw error('Completed transfer contract not found.', 404);
  }
  if (
    role !== 'admin' &&
    ![transfer.fromUserId?._id, transfer.toUserId?._id]
      .map(String)
      .includes(String(userId))
  ) {
    throw error('You cannot access this contract.', 403);
  }
  return buildTransferAgreementPdf(buildTransferContractData(transfer));
};

const releaseExpiredTransferLocks = async (now = new Date()) => {
  const transfers = await MembershipEntitlementTransfer.find({
    status: 'AWAITING_PAYMENT',
    lockExpiresAt: { $lte: now },
  }).select('_id entitlementId fromUserId');
  let released = 0;
  for (const transfer of transfers) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const closed = await MembershipEntitlementTransfer.findOneAndUpdate(
        {
          _id: transfer._id,
          status: 'AWAITING_PAYMENT',
          lockExpiresAt: { $lte: now },
        },
        { $set: { status: 'EXPIRED' } },
        { new: true, session }
      );
      if (!closed) {
        await session.abortTransaction();
        continue;
      }
      await MembershipSlotEntitlement.updateOne(
        {
          _id: transfer.entitlementId,
          ownerId: transfer.fromUserId,
          status: 'transfer_locked',
        },
        { $set: { status: 'active' } },
        { session }
      );
      await session.commitTransaction();
      released += 1;
    } catch (cause) {
      await session.abortTransaction();
      throw cause;
    } finally {
      session.endSession();
    }
  }
  return released;
};

module.exports = {
  OPEN_STATUSES,
  calculateTransferPricing,
  buildTransferContractData,
  buildTransferContractLines,
  createTransfer,
  acceptTransfer,
  rejectTransfer,
  approveTransfer,
  rejectByAdmin,
  settleTransfer,
  listTransfers,
  generateTransferPdf,
  releaseExpiredTransferLocks,
};
