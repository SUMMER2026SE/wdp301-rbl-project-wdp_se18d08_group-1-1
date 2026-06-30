const TicketPackage = require('../models/TicketPackage');
const User = require('../models/User');
const UserDetail = require('../models/UserDetail');
const Vehicle = require('../models/Vehicle');
const { normalizeLicensePlate } = require('./licensePlateUtils');

const toPackageSummary = (ticketPackage) => {
  if (!ticketPackage) return null;
  return {
    _id: ticketPackage._id.toString(),
    name: ticketPackage.name,
    type: ticketPackage.type,
    price: Number(ticketPackage.price || 0),
  };
};

const getDefaultPricingPackage = async () => {
  const hourlyPackage = await TicketPackage.findOne({ type: 'hourly', isActive: true })
    .sort({ price: 1 })
    .lean();

  if (hourlyPackage) return hourlyPackage;

  return TicketPackage.findOne({ isActive: true }).sort({ price: 1 }).lean();
};

const resolveUserFromContext = async ({ userId, phone, licensePlate }) => {
  if (userId) {
    const user = await User.findById(userId).lean();
    if (user) return user;
  }

  if (phone) {
    const detail = await UserDetail.findOne({ phone }).sort({ createdAt: -1 }).lean();
    if (detail?.userId) {
      const user = await User.findById(detail.userId).lean();
      if (user) return user;
    }
  }

  const normalizedPlate = normalizeLicensePlate(licensePlate);
  if (normalizedPlate) {
    const vehicle = await Vehicle.findOne({ licensePlate: normalizedPlate, status: 'approved' }).lean();
    if (vehicle?.owner) {
      const user = await User.findById(vehicle.owner).lean();
      if (user) return user;
    }
  }

  return null;
};

const resolveKioskPricingPackage = async ({ userId = null, phone = '', licensePlate = '' } = {}) => {
  const user = await resolveUserFromContext({ userId, phone, licensePlate });
  const now = new Date();

  if (user?.membership?.isVip && user.membership.expireAt && new Date(user.membership.expireAt) > now && user.membership.packageId) {
    const membershipPackage = await TicketPackage.findById(user.membership.packageId).lean();
    if (membershipPackage?.isActive) {
      return {
        package: toPackageSummary(membershipPackage),
        source: 'membership',
        userId: user._id.toString(),
      };
    }
  }

  const fallbackPackage = await getDefaultPricingPackage();
  return {
    package: toPackageSummary(fallbackPackage),
    source: 'default',
    userId: user?._id ? user._id.toString() : null,
  };
};

module.exports = {
  resolveKioskPricingPackage,
  toPackageSummary,
};
