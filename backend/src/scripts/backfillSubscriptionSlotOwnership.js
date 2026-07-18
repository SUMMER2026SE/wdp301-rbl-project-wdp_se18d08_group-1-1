const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Subscription = require('../models/Subscription');
const Slot = require('../models/Slot');

const applyChanges = process.argv.includes('--apply');

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const now = new Date();
  const subscriptions = await Subscription.find({
    status: 'active',
    paymentStatus: 'paid',
    expireAt: { $gt: now },
  }).lean();

  const claims = new Map();
  const report = {
    mode: applyChanges ? 'apply' : 'dry-run',
    subscriptions: subscriptions.length,
    claims: 0,
    updated: 0,
    missingSlots: [],
    userMismatches: [],
    conflicts: [],
  };

  for (const subscription of subscriptions) {
    for (const selected of subscription.slots || []) {
      const key = `${String(selected.floorId)}:${String(selected.slotCode).trim().toUpperCase()}`;
      if (!claims.has(key)) claims.set(key, []);
      claims.get(key).push(subscription);
      report.claims += 1;
    }
  }

  for (const [key, owners] of claims.entries()) {
    const [floorId, slotCode] = key.split(':');
    if (owners.length > 1) {
      report.conflicts.push({
        floorId,
        slotCode,
        subscriptionIds: owners.map((owner) => owner._id),
      });
      continue;
    }

    const owner = owners[0];
    const slot = await Slot.findOne({ floorID: floorId, slotNumber: slotCode });
    if (!slot) {
      report.missingSlots.push({ floorId, slotCode, subscriptionId: owner._id });
      continue;
    }
    if (!slot.reservedFor || String(slot.reservedFor) !== String(owner.user)) {
      report.userMismatches.push({
        floorId,
        slotCode,
        subscriptionId: owner._id,
        expectedUserId: owner.user,
        actualUserId: slot.reservedFor || null,
      });
      continue;
    }

    if (applyChanges) {
      await Slot.updateOne(
        { _id: slot._id, reservedFor: owner.user },
        {
          $set: {
            reservedBySubscriptionId: owner._id,
            reservedUntil: owner.expireAt,
          },
        }
      );
      report.updated += 1;
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.conflicts.length || report.missingSlots.length || report.userMismatches.length) {
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
