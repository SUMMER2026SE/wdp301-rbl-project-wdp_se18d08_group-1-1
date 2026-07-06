const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const UserDetail = require('../models/UserDetail');
const contractTermsService = require('./contractTermsService');
const notificationTriggers = require('./notificationTriggers');

const error = (message, statusCode = 400, extra = {}) => Object.assign(new Error(message), { statusCode, ...extra });

const CONTRACT_TYPES_BY_PACKAGE = {
  monthly: 'MONTHLY_PASS',
  yearly: 'YEARLY_PASS',
};

const populateContract = (query) => query
  .populate('userId', 'username email role')
  .populate('bookingId')
  .populate('vehicleId', 'licensePlate vehicleType brand model color')
  .populate('cancelledBy', 'username email role')
  .populate('transferredFrom', 'username email role');

const getPagination = (filters = {}, defaultLimit = 10) => {
  const page = Math.max(parseInt(filters.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || defaultLimit, 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const buildDateFilter = ({ startDate, endDate } = {}) => {
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);
  return Object.keys(createdAt).length ? { createdAt } : {};
};

function generateCandidateCode() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `CTR-${ymd}-${random}`;
}

async function generateUniqueContractCode() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const contractCode = generateCandidateCode();
    const exists = await Contract.exists({ contractCode });
    if (!exists) return contractCode;
  }
  throw error('Khong the tao ma hop dong duy nhat', 500);
}

async function resolveBookingVehicle(booking, ownerId = booking.userId) {
  let vehicle = await Vehicle.findOne({
    owner: ownerId,
    licensePlate: booking.licensePlate,
  }).lean();

  if (!vehicle && String(ownerId) !== String(booking.userId)) {
    vehicle = await Vehicle.findOne({
      owner: booking.userId,
      licensePlate: booking.licensePlate,
    }).lean();
  }

  if (!vehicle) {
    vehicle = await Vehicle.findOne({ licensePlate: booking.licensePlate }).lean();
  }

  if (!vehicle) {
    throw error('Vehicle not found for contract generation', 404);
  }

  return vehicle;
}

async function buildTerms(type, data) {
  const template = await contractTermsService.getTemplate(type);
  return contractTermsService.replacePlaceholders(template.content, data);
}

async function generateContract(bookingId, options = {}) {
  const session = options.session || null;
  const booking = await Booking.findById(bookingId).populate('ticketPackageId').session(session);
  if (!booking) throw error('Booking not found', 404);
  if (booking.contractId) return Contract.findById(booking.contractId).session(session);
  if (!booking.ticketPackageId || !CONTRACT_TYPES_BY_PACKAGE[booking.ticketPackageId.type]) return null;

  const vehicle = await resolveBookingVehicle(booking);
  const user = await User.findById(booking.userId).lean();
  const type = CONTRACT_TYPES_BY_PACKAGE[booking.ticketPackageId.type];
  const contractCode = await generateUniqueContractCode();
  const terms = await buildTerms(type, {
    customerName: user?.username,
    vehiclePlate: vehicle.licensePlate,
    startDate: booking.startTime,
    endDate: booking.endTime,
    totalAmount: booking.prepaidAmount,
    slotCode: booking.slotCode,
    contractCode,
  });

  const payload = {
    contractCode,
    userId: booking.userId,
    bookingId: booking._id,
    vehicleId: vehicle._id,
    type,
    status: 'DRAFT',
    slotCode: booking.slotCode,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: booking.prepaidAmount,
    paymentStatus: booking.paymentStatus,
    terms,
  };

  const created = session
    ? (await Contract.create([payload], { session }))[0]
    : await Contract.create(payload);

  booking.contractId = created._id;
  await booking.save({ session });

  return created;
}

async function activateContract(contractId, app = null) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw error('Khong tim thay hop dong', 404);
  if (contract.status === 'ACTIVE') return contract;
  if (['CANCELLED', 'EXPIRED'].includes(contract.status)) {
    throw error('Cannot activate cancelled or expired contract', 400);
  }

  contract.status = 'ACTIVE';
  contract.activatedAt = new Date();
  contract.paymentStatus = 'paid';
  await contract.save();

  notificationTriggers.notifyContractActivated(app, contract).catch((err) => {
    console.error('[Contract] Activation notification failed:', err.message);
  });

  return contract;
}

async function activateContractForBooking(bookingId, app = null) {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.paymentStatus !== 'paid' || !booking.contractId) return null;
  return activateContract(booking.contractId, app);
}

async function getCustomerContracts(userId, filters = {}) {
  const { page, limit, skip } = getPagination(filters, 10);
  const query = { userId };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  const [contracts, total] = await Promise.all([
    populateContract(Contract.find(query)).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    Contract.countDocuments(query),
  ]);

  return { contracts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function assertContractAccess(contract, userId, role, action = 'xem') {
  if (!contract) throw error('Khong tim thay hop dong', 404);
  if (role === 'customer' && String(contract.userId?._id || contract.userId) !== String(userId)) {
    throw error(`Ban khong co quyen ${action} hop dong nay`, 403);
  }
}

async function getContractById(contractId, userId, role) {
  const contract = await populateContract(Contract.findById(contractId)).lean({ virtuals: true });
  await assertContractAccess(contract, userId, role);
  return contract;
}

async function getContractByCode(contractCode, userId, role) {
  const contract = await populateContract(Contract.findOne({ contractCode })).lean({ virtuals: true });
  await assertContractAccess(contract, userId, role);
  return contract;
}

async function getAllContracts(filters = {}) {
  const { page, limit, skip } = getPagination(filters, 20);
  const query = { ...buildDateFilter(filters) };
  if (filters.userId) query.userId = filters.userId;
  if (filters.vehicleId) query.vehicleId = filters.vehicleId;
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    const [vehicles, users, details] = await Promise.all([
      Vehicle.find({ licensePlate: regex }).select('_id').lean(),
      User.find({ email: regex }).select('_id').lean(),
      UserDetail.find({ phone: regex }).select('userId').lean(),
    ]);
    query.$or = [
      { contractCode: regex },
      { vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) } },
      { userId: { $in: [...users.map((user) => user._id), ...details.map((detail) => detail.userId)] } },
    ];
  }

  const [contracts, total] = await Promise.all([
    populateContract(Contract.find(query)).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    Contract.countDocuments(query),
  ]);

  return { contracts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function cancelContract(contractId, cancellationReason, adminId, app = null) {
  if (!cancellationReason || String(cancellationReason).trim().length < 10) {
    throw error('Ly do huy phai co it nhat 10 ky tu', 400);
  }

  const contract = await Contract.findById(contractId);
  if (!contract) throw error('Khong tim thay hop dong', 404);
  if (contract.status === 'CANCELLED') throw error('Hop dong nay da bi huy truoc do', 400);
  if (contract.status === 'EXPIRED') throw error('Khong the huy hop dong da het han', 400);
  if (!['ACTIVE', 'DRAFT'].includes(contract.status)) throw error('Cannot cancel this contract status', 400);

  contract.status = 'CANCELLED';
  contract.cancelledAt = new Date();
  contract.cancelledBy = adminId;
  contract.cancellationReason = String(cancellationReason).trim();
  await contract.save();

  await Booking.findByIdAndUpdate(contract.bookingId, { status: 'cancelled' });

  notificationTriggers.notifyContractCancelled(app, contract).catch((err) => {
    console.error('[Contract] Cancellation notification failed:', err.message);
  });

  console.log(`[ContractAudit] admin=${adminId} cancelled contract=${contractId} at=${new Date().toISOString()}`);
  return populateContract(Contract.findById(contract._id));
}

async function expireContracts(app = null) {
  const now = new Date();
  const contracts = await Contract.find({ status: 'ACTIVE', endTime: { $lt: now } });
  for (const contract of contracts) {
    contract.status = 'EXPIRED';
    contract.expiredAt = now;
    await contract.save();
    notificationTriggers.notifyContractExpired(app, contract).catch((err) => {
      console.error('[Contract] Expiration notification failed:', err.message);
    });
  }
  return contracts.length;
}

async function createTransferContract({ transfer, booking, originalContractId, session }) {
  const vehicle = await resolveBookingVehicle(booking, transfer.fromUserId);
  const user = await User.findById(transfer.toUserId).lean();
  const contractCode = await generateUniqueContractCode();
  const terms = await buildTerms('TRANSFER', {
    customerName: user?.username,
    vehiclePlate: vehicle.licensePlate,
    startDate: new Date(),
    endDate: booking.endTime,
    totalAmount: booking.prepaidAmount,
    slotCode: booking.slotCode,
    contractCode,
  });

  if (originalContractId) {
    await Contract.findByIdAndUpdate(
      originalContractId,
      { status: 'TRANSFERRED', transferredAt: new Date() },
      { session }
    );
  }

  const created = await Contract.create(
    [{
      contractCode,
      userId: transfer.toUserId,
      bookingId: booking._id,
      vehicleId: vehicle._id,
      type: 'TRANSFER',
      status: 'ACTIVE',
      slotCode: booking.slotCode,
      startTime: new Date(),
      endTime: booking.endTime,
      totalAmount: booking.prepaidAmount,
      paymentStatus: booking.paymentStatus,
      terms,
      activatedAt: new Date(),
      transferredFrom: transfer.fromUserId,
      transferredAt: new Date(),
      metadata: {
        transferRequestId: transfer._id,
        originalContractId: originalContractId || null,
      },
    }],
    { session }
  );

  booking.contractId = created[0]._id;
  await booking.save({ session });
  return created[0];
}

module.exports = {
  CONTRACT_TYPES_BY_PACKAGE,
  generateUniqueContractCode,
  generateContract,
  activateContract,
  activateContractForBooking,
  getCustomerContracts,
  getContractById,
  getContractByCode,
  getAllContracts,
  cancelContract,
  expireContracts,
  createTransferContract,
};
