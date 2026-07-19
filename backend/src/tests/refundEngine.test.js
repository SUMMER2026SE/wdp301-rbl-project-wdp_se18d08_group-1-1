const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyMinimumBillableMinutes,
  calculateCancellationRefund,
  calculateEarlyCheckoutRefund,
  calculateNoShowRefund,
  calculateServiceRefund,
  normalizeRule,
  selectCancellationTier,
} = require('../services/refundEngine');

const baseRule = () => ({
  cancellationTiers: [
    { minimumMinutesBeforeStart: 0, refundPercent: 0 },
    { minimumMinutesBeforeStart: 30, refundPercent: 50 },
    { minimumMinutesBeforeStart: 60, refundPercent: 100 },
  ],
  noShowRefundPercent: 25,
  minimumBillableMinutes: 60,
  earlyCheckout: {
    mode: 'actual_usage',
    fixedRefundPercent: 0,
    feePercent: 0,
  },
  serviceRefundPercent: {
    pending: 100,
    inProgress: 50,
    done: 0,
    cancelled: 75,
  },
});

test('normalizeRule sorts unordered cancellation tiers descending', () => {
  const normalized = normalizeRule(baseRule());

  assert.deepEqual(
    normalized.cancellationTiers.map((tier) => tier.minimumMinutesBeforeStart),
    [60, 30, 0]
  );
  assert.equal(selectCancellationTier(normalized, 45).refundPercent, 50);
});

test('normalizeRule accepts legacy service refund configuration but forces every status to zero', () => {
  const normalized = normalizeRule(baseRule());
  const withoutLegacyField = baseRule();
  delete withoutLegacyField.serviceRefundPercent;

  assert.deepEqual(normalized.serviceRefundPercent, {
    pending: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
  });
  assert.deepEqual(normalizeRule(withoutLegacyField).serviceRefundPercent, {
    pending: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
  });
});

test('cancellation below every configured threshold defaults to zero refund', () => {
  const rule = baseRule();
  rule.cancellationTiers = [
    { minimumMinutesBeforeStart: 60, refundPercent: 100 },
  ];

  const result = calculateCancellationRefund({
    rule,
    minutesBeforeStart: 10,
    parkingAmount: 100_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 100_000,
  });

  assert.equal(result.appliedRefundPercent, 0);
  assert.equal(result.appliedThresholdMinutes, 0);
  assert.equal(result.parkingRefund, 0);
  assert.equal(result.refundAmount, 0);
});

test('normalizeRule rejects duplicate cancellation thresholds', () => {
  const rule = baseRule();
  rule.cancellationTiers.push({ minimumMinutesBeforeStart: 30, refundPercent: 10 });

  assert.throws(() => normalizeRule(rule), /thresholds must be unique/i);
});

test('normalizeRule rejects invalid tiers, percentages, modes, and billable minutes', () => {
  const invalidRules = [
    { mutate: (rule) => { rule.cancellationTiers = []; }, message: /valid cancellation tier/i },
    {
      mutate: (rule) => { rule.cancellationTiers[0].minimumMinutesBeforeStart = -1; },
      message: /valid cancellation tier/i,
    },
    {
      mutate: (rule) => { rule.cancellationTiers[0].refundPercent = 10.5; },
      message: /integer between 0 and 100/i,
    },
    {
      mutate: (rule) => { rule.noShowRefundPercent = 101; },
      message: /integer between 0 and 100/i,
    },
    {
      mutate: (rule) => { rule.earlyCheckout.feePercent = -1; },
      message: /integer between 0 and 100/i,
    },
    {
      mutate: (rule) => { rule.earlyCheckout.mode = 'sometimes'; },
      message: /invalid early checkout mode/i,
    },
    {
      mutate: (rule) => { rule.minimumBillableMinutes = 1441; },
      message: /between 0 and 1440/i,
    },
  ];

  for (const { mutate, message } of invalidRules) {
    const rule = baseRule();
    mutate(rule);
    assert.throws(() => normalizeRule(rule), message);
  }
});

test('custom no-show rule refunds parking only and never refunds services', () => {
  const result = calculateNoShowRefund({
    rule: baseRule(),
    parkingAmount: 80_000,
    serviceAmount: 40_000,
    paidTotal: 120_000,
    services: [
      { _id: 'pending', status: 'pending', price: 20_000 },
      { _id: 'done', status: 'done', price: 20_000 },
    ],
  });

  assert.equal(result.parkingRefund, 20_000);
  assert.equal(result.refundableServiceAmount, 0);
  assert.equal(result.refundAmount, 20_000);
});

test('service refund compatibility helper always returns zero', () => {
  const result = calculateServiceRefund({
    rule: baseRule(),
    refundableServiceAmount: 40_000,
    services: [
      { serviceId: 'pending', status: 'pending', price: 10_000 },
      { serviceId: 'progress', status: 'in_progress', price: 10_000 },
      { serviceId: 'done', status: 'done', price: 10_000 },
      { serviceId: 'cancelled', status: 'cancelled', price: 10_000 },
    ],
  });

  assert.deepEqual(result.lines, []);
  assert.equal(result.refundAmount, 0);
});

test('cancellation and actual-usage checkout never refund service add-ons', () => {
  const services = [
    { serviceId: 'pending', status: 'pending', price: 20_000 },
    { serviceId: 'cancelled', status: 'cancelled', price: 20_000 },
  ];
  const cancellation = calculateCancellationRefund({
    rule: baseRule(),
    minutesBeforeStart: 60,
    parkingAmount: 80_000,
    serviceAmount: 40_000,
    services,
    paidTotal: 120_000,
  });
  const checkout = calculateEarlyCheckoutRefund({
    rule: baseRule(),
    parkingAmount: 80_000,
    serviceAmount: 40_000,
    services,
    paidTotal: 120_000,
    actualParkingCharge: 20_000,
  });

  assert.equal(cancellation.parkingRefund, 80_000);
  assert.equal(cancellation.refundableServiceAmount, 0);
  assert.equal(cancellation.refundAmount, 80_000);
  assert.deepEqual(cancellation.serviceLines, []);

  assert.equal(checkout.parkingRefund, 60_000);
  assert.equal(checkout.refundableServiceAmount, 0);
  assert.equal(checkout.refundAmount, 60_000);
  assert.deepEqual(checkout.serviceLines, []);
});

test('actual-usage early checkout refunds unused parking and reports overage', () => {
  const refund = calculateEarlyCheckoutRefund({
    rule: baseRule(),
    parkingAmount: 100_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 100_000,
    actualParkingCharge: 40_000,
  });
  const overage = calculateEarlyCheckoutRefund({
    rule: baseRule(),
    parkingAmount: 100_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 100_000,
    actualParkingCharge: 130_000,
  });

  assert.equal(refund.parkingRefund, 60_000);
  assert.equal(refund.refundAmount, 60_000);
  assert.equal(overage.refundAmount, 0);
  assert.equal(overage.extraAmount, 30_000);
});

test('fixed-percent mode applies percentage to unused parking only', () => {
  const rule = baseRule();
  rule.earlyCheckout.mode = 'fixed_refund_percent';
  rule.earlyCheckout.fixedRefundPercent = 25;

  const result = calculateEarlyCheckoutRefund({
    rule,
    parkingAmount: 100_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 100_000,
    actualParkingCharge: 20_000,
  });

  assert.equal(result.unusedParkingValue, 80_000);
  assert.equal(result.parkingRefund, 20_000);
});

test('no-refund mode does not refund parking or services', () => {
  const rule = baseRule();
  rule.earlyCheckout.mode = 'no_refund';

  const result = calculateEarlyCheckoutRefund({
    rule,
    parkingAmount: 100_000,
    serviceAmount: 10_000,
    services: [{ status: 'pending', price: 10_000 }],
    paidTotal: 110_000,
    actualParkingCharge: 10_000,
  });

  assert.equal(result.parkingRefund, 0);
  assert.equal(result.refundableServiceAmount, 0);
  assert.equal(result.refundAmount, 0);
});

test('fee uses floor rounding and 100% fee removes the parking refund', () => {
  const roundedRule = baseRule();
  roundedRule.earlyCheckout.feePercent = 33;
  const rounded = calculateEarlyCheckoutRefund({
    rule: roundedRule,
    parkingAmount: 1_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 1_000,
    actualParkingCharge: 0,
  });

  const fullFeeRule = baseRule();
  fullFeeRule.earlyCheckout.feePercent = 100;
  const fullFee = calculateEarlyCheckoutRefund({
    rule: fullFeeRule,
    parkingAmount: 1_000,
    serviceAmount: 0,
    services: [],
    paidTotal: 1_000,
    actualParkingCharge: 0,
  });

  assert.equal(rounded.feeAmount, 330);
  assert.equal(rounded.parkingRefund, 670);
  assert.equal(fullFee.feeAmount, 1_000);
  assert.equal(fullFee.parkingRefund, 0);
});

test('refund is floored and clamped to the amount actually paid', () => {
  const rule = baseRule();
  rule.cancellationTiers = [{ minimumMinutesBeforeStart: 0, refundPercent: 33 }];

  const result = calculateCancellationRefund({
    rule,
    minutesBeforeStart: 0,
    parkingAmount: 10_001,
    serviceAmount: 10_000,
    services: [{ status: 'pending', price: 10_000 }],
    paidTotal: 12_000,
  });

  assert.equal(result.parkingRefund, 3_300);
  assert.equal(result.refundAmount, 3_300);
});

test('minimum billable intervals accept 0 and extend short occupancy to 30/60/1440 minutes', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-01T00:10:00.000Z');

  for (const minimumMinutes of [0, 30, 60, 1440]) {
    const result = applyMinimumBillableMinutes(
      [{ start, end }],
      minimumMinutes,
      new Date('2026-01-02T00:00:00.000Z')
    );
    const durationMinutes = (result[0].end - result[0].start) / 60_000;
    assert.equal(durationMinutes, Math.max(10, minimumMinutes));
  }
});

test('minimum billable time extends the first interval and preserves later intervals', () => {
  const intervals = [
    {
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2026-01-01T00:10:00.000Z'),
    },
    {
      start: new Date('2026-01-01T01:00:00.000Z'),
      end: new Date('2026-01-01T01:10:00.000Z'),
    },
  ];

  const result = applyMinimumBillableMinutes(intervals, 30);

  assert.equal(result[0].end.toISOString(), '2026-01-01T00:20:00.000Z');
  assert.equal(result[1].end.toISOString(), '2026-01-01T01:10:00.000Z');
});

test('minimum billable time remains satisfied when extension overlaps another interval', () => {
  const result = applyMinimumBillableMinutes(
    [
      {
        start: new Date('2026-01-01T00:00:00.000Z'),
        end: new Date('2026-01-01T00:10:00.000Z'),
      },
      {
        start: new Date('2026-01-01T00:15:00.000Z'),
        end: new Date('2026-01-01T00:25:00.000Z'),
      },
    ],
    30
  );

  const totalMinutes = result.reduce(
    (sum, interval) => sum + (interval.end - interval.start) / 60_000,
    0
  );
  assert.equal(totalMinutes, 30);
});

test('invalid intervals are ignored without mutating caller-owned dates', () => {
  const originalEnd = new Date('2026-01-01T00:10:00.000Z');
  const result = applyMinimumBillableMinutes(
    [
      { start: new Date('invalid'), end: new Date('2026-01-01T00:10:00.000Z') },
      { start: new Date('2026-01-01T00:10:00.000Z'), end: originalEnd },
      {
        start: new Date('2026-01-01T00:00:00.000Z'),
        end: originalEnd,
      },
    ],
    30
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].end.toISOString(), '2026-01-01T00:30:00.000Z');
  assert.equal(originalEnd.toISOString(), '2026-01-01T00:10:00.000Z');
});
