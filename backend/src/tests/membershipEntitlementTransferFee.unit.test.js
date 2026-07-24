const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const WalletTransaction = require('../models/WalletTransaction');
const {
  calculateTransferPricing,
} = require('../services/membershipEntitlementTransferService');

test('transfer fee is exactly 5% without rounding or minimum and maximum clamps', () => {
  const regular = calculateTransferPricing(
    {
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2026-07-31T00:00:00.000Z'),
      unitAmount: 300000,
    },
    120000,
    new Date('2026-07-16T00:00:00.000Z')
  );
  const belowFormerMinimum = calculateTransferPricing(
    {
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2026-07-31T00:00:00.000Z'),
      unitAmount: 10000,
    },
    0,
    new Date('2026-07-01T00:00:00.000Z')
  );
  const aboveFormerMaximum = calculateTransferPricing(
    {
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2026-07-31T00:00:00.000Z'),
      unitAmount: 2000000,
    },
    0,
    new Date('2026-07-01T00:00:00.000Z')
  );

  assert.equal(regular.remainingValue, 150000);
  assert.equal(regular.transferFee, 7500);
  assert.equal(regular.totalDue, 127500);
  assert.equal(belowFormerMinimum.transferFee, 500);
  assert.equal(aboveFormerMaximum.transferFee, 100000);
});

test('wallet transaction accepts a transfer fee below 1,000 VND only for TRANSFER_FEE', () => {
  const common = {
    userId: new mongoose.Types.ObjectId(),
    walletId: new mongoose.Types.ObjectId(),
    amount: 500,
    balanceBefore: 10000,
    balanceAfter: 9500,
    status: 'COMPLETED',
  };
  const feeValidation = new WalletTransaction({
    ...common,
    type: 'TRANSFER_FEE',
  }).validateSync();
  const paymentValidation = new WalletTransaction({
    ...common,
    type: 'PAYMENT',
  }).validateSync();

  assert.equal(feeValidation, undefined);
  assert.ok(paymentValidation?.errors?.amount);
});
