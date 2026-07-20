const MembershipSlotEntitlement = require('../models/MembershipSlotEntitlement');
const Slot = require('../models/Slot');
const { recomputeUserMembership } = require('./membershipProjectionService');

const normalizeSlotCode = (value) => String(value || '').trim().toUpperCase();

const activateSubscriptionEntitlements = async (subscription, options = {}) => {
  const { session = null, rotateQr = true } = options;
  const selectedSlots = subscription.slots || [];
  const unitAmount = Math.round(
    Number(subscription.amount || 0) / Math.max(1, selectedSlots.length)
  );
  const entitlements = [];

  for (const selected of selectedSlots) {
    const slotQuery = Slot.findOne({
      floorID: selected.floorId,
      slotNumber: normalizeSlotCode(selected.slotCode),
    });
    if (session) slotQuery.session(session);
    const slot = await slotQuery;
    if (!slot) {
      throw Object.assign(new Error(`Slot ${selected.slotCode} no longer exists.`), {
        code: 'SLOT_NOT_FOUND',
        statusCode: 404,
      });
    }
    if (slot.reservedFor && String(slot.reservedFor) !== String(subscription.user)) {
      throw Object.assign(new Error(`Slot ${selected.slotCode} is already reserved.`), {
        code: 'SLOT_ALREADY_RESERVED',
        statusCode: 409,
      });
    }

    const entitlement = await MembershipSlotEntitlement.findOneAndUpdate(
      { sourceSubscriptionId: subscription._id, slotId: slot._id },
      {
        $set: {
          ownerId: subscription.user,
          floorId: selected.floorId,
          slotCode: normalizeSlotCode(selected.slotCode),
          packageId: subscription.ticketPackage,
          validFrom: subscription.validFrom || subscription.createdAt || new Date(),
          expireAt: subscription.expireAt,
          status: 'active',
          unitAmount,
        },
        $setOnInsert: { transferCount: 0 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    );
    if (!entitlement.lineageRootId) {
      entitlement.lineageRootId = entitlement._id;
      await entitlement.save({ session });
    }

    const slotResult = await Slot.updateOne(
      {
        _id: slot._id,
        $or: [
          { reservedFor: null },
          { reservedFor: { $exists: false } },
          { reservedFor: subscription.user },
        ],
      },
      {
        $set: {
          reservedFor: subscription.user,
          reservedBySubscriptionId: subscription._id,
          reservedByEntitlementId: entitlement._id,
          reservedUntil: subscription.expireAt,
        },
      },
      { session }
    );
    if (slotResult.matchedCount !== 1) {
      throw Object.assign(new Error(`Slot ${selected.slotCode} ownership changed.`), {
        code: 'SLOT_OWNERSHIP_CHANGED',
        statusCode: 409,
      });
    }
    entitlements.push(entitlement);
  }

  await recomputeUserMembership(subscription.user, { session, rotateQr });
  return entitlements;
};

module.exports = {
  activateSubscriptionEntitlements,
  normalizeSlotCode,
};
