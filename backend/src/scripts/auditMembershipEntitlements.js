const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MembershipSlotEntitlement = require('../models/MembershipSlotEntitlement');
const Slot = require('../models/Slot');
const User = require('../models/User');
const { deriveMembershipProjection } = require('../services/membershipProjectionService');

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const now = new Date();
  const entitlements = await MembershipSlotEntitlement.find({
    status: { $in: ['active', 'transfer_locked'] },
    expireAt: { $gt: now },
  }).lean();
  const report = {
    activeEntitlements: entitlements.length,
    valid: 0,
    missingSlots: [],
    ownershipMismatches: [],
    orphanedSlotPointers: [],
    projectionMismatches: [],
  };

  for (const entitlement of entitlements) {
    const slot = await Slot.findById(entitlement.slotId).lean();
    if (!slot) {
      report.missingSlots.push({
        entitlementId: entitlement._id,
        slotId: entitlement.slotId,
      });
      continue;
    }

    const matches =
      String(slot.reservedFor || '') === String(entitlement.ownerId) &&
      String(slot.reservedByEntitlementId || '') === String(entitlement._id);
    if (!matches) {
      report.ownershipMismatches.push({
        entitlementId: entitlement._id,
        slotId: slot._id,
        expectedOwnerId: entitlement.ownerId,
        actualOwnerId: slot.reservedFor || null,
        actualEntitlementId: slot.reservedByEntitlementId || null,
      });
      continue;
    }
    report.valid += 1;
  }

  const pointedSlots = await Slot.find({
    reservedByEntitlementId: { $ne: null },
  }).select('reservedByEntitlementId reservedFor slotNumber');
  const entitlementIds = new Set(entitlements.map((item) => String(item._id)));
  for (const slot of pointedSlots) {
    if (!entitlementIds.has(String(slot.reservedByEntitlementId))) {
      report.orphanedSlotPointers.push({
        slotId: slot._id,
        slotCode: slot.slotNumber,
        entitlementId: slot.reservedByEntitlementId,
        reservedFor: slot.reservedFor,
      });
    }
  }

  const byOwner = new Map();
  for (const entitlement of entitlements) {
    const key = String(entitlement.ownerId);
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(entitlement);
  }
  const users = await User.find({
    $or: [
      { _id: { $in: [...byOwner.keys()] } },
      { 'membership.isVip': true },
    ],
  })
    .select('membership')
    .lean();
  for (const user of users) {
    const expected = deriveMembershipProjection(byOwner.get(String(user._id)) || [], now);
    const actualExpireAt = user.membership?.expireAt
      ? new Date(user.membership.expireAt).getTime()
      : null;
    if (
      Boolean(user.membership?.isVip) !== expected.isVip ||
      actualExpireAt !== expected.expireAt?.getTime() ||
      String(user.membership?.packageId || '') !== String(expected.packageId || '')
    ) {
      report.projectionMismatches.push({
        userId: user._id,
        actual: user.membership,
        expected,
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (
    report.missingSlots.length ||
    report.ownershipMismatches.length ||
    report.orphanedSlotPointers.length ||
    report.projectionMismatches.length
  ) {
    process.exitCode = 2;
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
