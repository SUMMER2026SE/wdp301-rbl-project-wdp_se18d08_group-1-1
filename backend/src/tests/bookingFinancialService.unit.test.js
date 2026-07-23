const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateBookingFinancialSummary,
} = require('../services/bookingFinancialService');

test('booking financial summary combines base, overage, settlement and paid refund', () => {
  const result = calculateBookingFinancialSummary(
    {
      prepaidAmount: 20000,
      paidOverageAdjustments: [{ amount: 10000 }],
      refundSettlements: [
        { payoutStatus: 'debited', netWalletAmount: -130000 },
        { payoutStatus: 'credited', netWalletAmount: 8000 },
      ],
    },
    8000
  );

  assert.deepEqual(result, {
    prepaidCollected: 20000,
    overageCollected: 10000,
    settlementExtraCollected: 130000,
    additionalCollected: 140000,
    grossRevenue: 160000,
    refundPaid: 8000,
    actualRevenue: 152000,
  });
});

test('booking financial summary falls back to credited settlement refund', () => {
  const result = calculateBookingFinancialSummary({
    prepaidAmount: 25000,
    refundSettlements: [
      { payoutStatus: 'credited', netWalletAmount: 10000 },
    ],
  });

  assert.equal(result.grossRevenue, 25000);
  assert.equal(result.refundPaid, 10000);
  assert.equal(result.actualRevenue, 15000);
});
