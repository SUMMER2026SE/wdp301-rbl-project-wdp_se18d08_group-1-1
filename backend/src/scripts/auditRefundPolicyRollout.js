const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Booking = require('../models/Booking');
const Policy = require('../models/Policy');
const RefundRuleVersion = require('../models/RefundRuleVersion');
const WalletTransaction = require('../models/WalletTransaction');

dotenv.config();

const run = async () => {
  await connectDB();

  const paidPopulation = {
    prepaidAmount: { $gt: 0 },
    $or: [
      { status: { $in: ['PAID', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'] } },
      {
        status: 'CANCELLED',
        $or: [
          { paymentMethod: 'wallet' },
          { 'refundPolicySnapshot.source': { $ne: null } },
          { 'refundSettlements.0': { $exists: true } },
        ],
      },
    ],
  };
  const [
    designatedPolicies,
    paidBookings,
    paidWithoutPolicySnapshot,
    paidWithoutPaymentBreakdown,
    duplicateIdempotencyKeys,
    publishedRules,
    policyIndexes,
    walletIndexes,
  ] = await Promise.all([
    Policy.countDocuments({ controlsBookingRefunds: true, deletedAt: null }),
    Booking.countDocuments(paidPopulation),
    Booking.countDocuments({
      ...paidPopulation,
      'refundPolicySnapshot.source': null,
    }),
    Booking.countDocuments({
      ...paidPopulation,
      'paymentBreakdownSnapshot.source': null,
    }),
    WalletTransaction.aggregate([
      { $match: { idempotencyKey: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$idempotencyKey', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ]),
    RefundRuleVersion.countDocuments({ status: 'published' }),
    Policy.collection.indexes(),
    WalletTransaction.collection.indexes(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    designatedPolicies,
    publishedRules,
    paidBookings,
    paidWithoutPolicySnapshot,
    paidWithoutPaymentBreakdown,
    duplicateRefundTransactionKeys: duplicateIdempotencyKeys,
    requiredIndexes: {},
    ready:
      designatedPolicies <= 1 &&
      paidWithoutPolicySnapshot === 0 &&
      paidWithoutPaymentBreakdown === 0 &&
      duplicateIdempotencyKeys.length === 0,
  };
  report.requiredIndexes.policyDesignationUnique = policyIndexes.some(
    (index) => index.unique && index.key?.controlsBookingRefunds === 1
  );
  report.requiredIndexes.walletIdempotencyUnique = walletIndexes.some(
    (index) => index.unique && index.key?.idempotencyKey === 1
  );
  report.ready =
    report.ready &&
    report.requiredIndexes.policyDesignationUnique &&
    report.requiredIndexes.walletIdempotencyUnique;

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ready ? 0 : 2;
};

run()
  .catch((error) => {
    console.error('[RefundAudit] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
