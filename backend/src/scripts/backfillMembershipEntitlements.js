const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MembershipSlotEntitlement = require('../models/MembershipSlotEntitlement');
const Subscription = require('../models/Subscription');
const Slot = require('../models/Slot');
const { recomputeUserMembership } = require('../services/membershipProjectionService');

const applyChanges = process.argv.includes('--apply');

const entitlementStatusFor = (subscription, now) => {
  if (subscription.status === 'cancelled' || subscription.paymentStatus === 'cancelled') {
    return 'cancelled';
  }
  if (
    subscription.status === 'active' &&
    subscription.paymentStatus === 'paid' &&
    new Date(subscription.expireAt) > now
  ) {
    return 'active';
  }
  if (new Date(subscription.expireAt) <= now || subscription.status === 'expired') {
    return 'expired';
  }
  if (subscription.status === 'failed' || subscription.paymentStatus === 'failed') {
    return 'activation_failed';
  }
  return 'pending';
};

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const now = new Date();
  const subscriptions = await Subscription.find({ 'slots.0': { $exists: true } }).lean();
  const report = {
    mode: applyChanges ? 'apply' : 'dry-run',
    subscriptions: subscriptions.length,
    slotClaims: 0,
    createdOrUpdated: 0,
    slotOwnershipUpdated: 0,
    missingSlots: [],
    ownershipConflicts: [],
  };
  const affectedUsers = new Set();

  for (const subscription of subscriptions) {
    const selectedSlots = subscription.slots || [];
    const unitAmount = Math.round(
      Number(subscription.amount || 0) / Math.max(1, selectedSlots.length)
    );
    const status = entitlementStatusFor(subscription, now);

    for (const selected of selectedSlots) {
      report.slotClaims += 1;
      const slotCode = String(selected.slotCode || '').trim().toUpperCase();
      const slot = await Slot.findOne({
        floorID: selected.floorId,
        slotNumber: slotCode,
      });
      if (!slot) {
        report.missingSlots.push({
          subscriptionId: subscription._id,
          floorId: selected.floorId,
          slotCode,
        });
        continue;
      }

      if (
        status === 'active' &&
        slot.reservedFor &&
        String(slot.reservedFor) !== String(subscription.user)
      ) {
        report.ownershipConflicts.push({
          subscriptionId: subscription._id,
          slotId: slot._id,
          expectedOwnerId: subscription.user,
          actualOwnerId: slot.reservedFor,
        });
        continue;
      }

      if (!applyChanges) continue;

      const entitlement = await MembershipSlotEntitlement.findOneAndUpdate(
        { sourceSubscriptionId: subscription._id, slotId: slot._id },
        {
          $set: {
            ownerId: subscription.user,
            floorId: selected.floorId,
            slotCode,
            packageId: subscription.ticketPackage,
            validFrom: subscription.validFrom || subscription.createdAt,
            expireAt: subscription.expireAt,
            status,
            unitAmount,
          },
          $setOnInsert: {
            transferCount: 0,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      if (!entitlement.lineageRootId) {
        entitlement.lineageRootId = entitlement._id;
        await entitlement.save();
      }
      report.createdOrUpdated += 1;
      affectedUsers.add(String(subscription.user));

      if (status === 'active') {
        await Slot.updateOne(
          { _id: slot._id },
          {
            $set: {
              reservedFor: subscription.user,
              reservedBySubscriptionId: subscription._id,
              reservedByEntitlementId: entitlement._id,
              reservedUntil: subscription.expireAt,
            },
          }
        );
        report.slotOwnershipUpdated += 1;
      }
    }
  }

  if (applyChanges) {
    for (const userId of affectedUsers) {
      await recomputeUserMembership(userId);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.missingSlots.length || report.ownershipConflicts.length) process.exitCode = 2;
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
