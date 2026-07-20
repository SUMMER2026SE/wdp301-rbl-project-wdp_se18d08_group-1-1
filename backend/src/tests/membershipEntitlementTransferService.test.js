const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateTransferPricing,
} = require('../services/membershipEntitlementTransferService');

test('calculates prorated transfer value and clamps the processing fee', () => {
  const now = new Date('2026-07-16T00:00:00.000Z');
  const result = calculateTransferPricing(
    {
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2026-07-31T00:00:00.000Z'),
      unitAmount: 300000,
    },
    120000,
    now
  );

  assert.equal(result.remainingValue, 150000);
  assert.equal(result.askingPrice, 120000);
  assert.equal(result.transferFee, 10000);
  assert.equal(result.totalDue, 130000);
});

test('allows a free transfer but still charges the minimum processing fee', () => {
  const result = calculateTransferPricing(
    {
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2026-08-01T00:00:00.000Z'),
      unitAmount: 300000,
    },
    0,
    new Date('2026-07-10T00:00:00.000Z')
  );
  assert.equal(result.askingPrice, 0);
  assert.equal(result.transferFee, 10000);
});

test('rejects an asking price above the remaining value', () => {
  assert.throws(
    () =>
      calculateTransferPricing(
        {
          validFrom: new Date('2026-07-01T00:00:00.000Z'),
          expireAt: new Date('2026-07-31T00:00:00.000Z'),
          unitAmount: 300000,
        },
        151000,
        new Date('2026-07-16T00:00:00.000Z')
      ),
    /cannot exceed remaining value/
  );
});
