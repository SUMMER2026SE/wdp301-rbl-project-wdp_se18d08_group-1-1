const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateCancellationRefund,
  calculateNoShowRefund,
} = require('../services/refundEngine');
const {
  LEGACY_REFUND_RULE,
  cloneLegacyRefundRule,
} = require('../services/refundLegacyDefaults');

const parkingOnly = {
  rule: LEGACY_REFUND_RULE,
  parkingAmount: 100_000,
  serviceAmount: 0,
  services: [],
  paidTotal: 100_000,
};

test('legacy cancellation preserves the 60/59/30/29 minute boundaries', () => {
  const cases = [
    { minutesBeforeStart: 60, expectedPercent: 100, expectedRefund: 100_000 },
    { minutesBeforeStart: 59, expectedPercent: 50, expectedRefund: 50_000 },
    { minutesBeforeStart: 30, expectedPercent: 50, expectedRefund: 50_000 },
    { minutesBeforeStart: 29, expectedPercent: 0, expectedRefund: 0 },
  ];

  for (const current of cases) {
    const result = calculateCancellationRefund({ ...parkingOnly, ...current });
    assert.equal(result.appliedRefundPercent, current.expectedPercent);
    assert.equal(result.refundAmount, current.expectedRefund);
  }
});

test('legacy no-show keeps parking refund at zero', () => {
  const result = calculateNoShowRefund(parkingOnly);

  assert.equal(result.appliedRefundPercent, 0);
  assert.equal(result.parkingRefund, 0);
  assert.equal(result.refundAmount, 0);
});

test('cloning legacy rules is deep and does not mutate the frozen defaults', () => {
  const first = cloneLegacyRefundRule();
  const second = cloneLegacyRefundRule();

  first.cancellationTiers[0].refundPercent = 1;
  first.earlyCheckout.mode = 'no_refund';

  assert.equal(second.cancellationTiers[0].refundPercent, 100);
  assert.equal(second.earlyCheckout.mode, 'actual_usage');
  assert.equal(LEGACY_REFUND_RULE.cancellationTiers[0].refundPercent, 100);
});
