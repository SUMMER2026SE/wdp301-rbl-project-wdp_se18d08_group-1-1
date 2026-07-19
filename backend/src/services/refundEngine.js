const { cloneLegacyRefundRule } = require('./refundLegacyDefaults');

const clampMoney = (value, maximum = Number.MAX_SAFE_INTEGER) =>
  Math.max(0, Math.min(Math.floor(Number(value) || 0), Math.max(0, Number(maximum) || 0)));

const normalizePercent = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100) {
    throw Object.assign(new Error(`${label} must be an integer between 0 and 100`), {
      statusCode: 400,
    });
  }
  return number;
};

const normalizeRule = (input) => {
  const source = input || cloneLegacyRefundRule();
  const tiers = Array.isArray(source.cancellationTiers)
    ? source.cancellationTiers.map((tier) => ({
        minimumMinutesBeforeStart: Number(tier.minimumMinutesBeforeStart),
        refundPercent: normalizePercent(tier.refundPercent, 'Cancellation refund percent'),
      }))
    : [];

  if (
    tiers.length === 0 ||
    tiers.some(
      (tier) =>
        !Number.isInteger(tier.minimumMinutesBeforeStart) ||
        tier.minimumMinutesBeforeStart < 0
    )
  ) {
    throw Object.assign(new Error('At least one valid cancellation tier is required'), {
      statusCode: 400,
    });
  }

  const uniqueThresholds = new Set(tiers.map((tier) => tier.minimumMinutesBeforeStart));
  if (uniqueThresholds.size !== tiers.length) {
    throw Object.assign(new Error('Cancellation tier thresholds must be unique'), {
      statusCode: 400,
    });
  }

  const minimumBillableMinutes = Number(source.minimumBillableMinutes);
  if (
    !Number.isInteger(minimumBillableMinutes) ||
    minimumBillableMinutes < 0 ||
    minimumBillableMinutes > 1440
  ) {
    throw Object.assign(new Error('Minimum billable minutes must be between 0 and 1440'), {
      statusCode: 400,
    });
  }

  const mode = source.earlyCheckout?.mode || 'actual_usage';
  if (!['actual_usage', 'fixed_refund_percent', 'no_refund'].includes(mode)) {
    throw Object.assign(new Error('Invalid early checkout mode'), { statusCode: 400 });
  }

  return {
    cancellationTiers: tiers.sort(
      (left, right) => right.minimumMinutesBeforeStart - left.minimumMinutesBeforeStart
    ),
    noShowRefundPercent: normalizePercent(
      source.noShowRefundPercent,
      'No-show refund percent'
    ),
    minimumBillableMinutes,
    earlyCheckout: {
      mode,
      fixedRefundPercent: normalizePercent(
        source.earlyCheckout?.fixedRefundPercent || 0,
        'Fixed refund percent'
      ),
      feePercent: normalizePercent(
        source.earlyCheckout?.feePercent || 0,
        'Early checkout fee percent'
      ),
    },
    // Retained in normalized snapshots for compatibility with rules already stored in MongoDB.
    // Add-on services are currently non-refundable for every booking refund event.
    serviceRefundPercent: {
      pending: 0,
      inProgress: 0,
      done: 0,
      cancelled: 0,
    },
  };
};

const selectCancellationTier = (rule, minutesBeforeStart) => {
  const normalized = normalizeRule(rule);
  const minutes = Math.max(0, Math.floor(Number(minutesBeforeStart) || 0));
  return (
    normalized.cancellationTiers.find(
      (tier) => minutes >= tier.minimumMinutesBeforeStart
    ) || { minimumMinutesBeforeStart: 0, refundPercent: 0 }
  );
};

const calculateServiceRefund = () => ({
  refundAmount: 0,
  lines: [],
});

const calculateCancellationRefund = ({
  rule,
  minutesBeforeStart,
  parkingAmount,
  paidTotal,
}) => {
  const tier = selectCancellationTier(rule, minutesBeforeStart);
  const parkingBase = clampMoney(parkingAmount, paidTotal);
  const parkingRefund = clampMoney((parkingBase * tier.refundPercent) / 100, parkingBase);
  const refundAmount = clampMoney(parkingRefund, paidTotal);

  return {
    eventType: 'cancellation',
    refundAmount,
    extraAmount: 0,
    parkingRefund,
    refundableServiceAmount: 0,
    feeAmount: 0,
    appliedRefundPercent: tier.refundPercent,
    appliedThresholdMinutes: tier.minimumMinutesBeforeStart,
    serviceLines: [],
    calculationVersion: 'refund-engine-v1',
  };
};

const calculateNoShowRefund = ({
  rule,
  parkingAmount,
  paidTotal,
}) => {
  const normalized = normalizeRule(rule);
  const parkingBase = clampMoney(parkingAmount, paidTotal);
  const parkingRefund = clampMoney(
    (parkingBase * normalized.noShowRefundPercent) / 100,
    parkingBase
  );
  return {
    eventType: 'no_show',
    refundAmount: clampMoney(parkingRefund, paidTotal),
    extraAmount: 0,
    parkingRefund,
    refundableServiceAmount: 0,
    feeAmount: 0,
    appliedRefundPercent: normalized.noShowRefundPercent,
    serviceLines: [],
    calculationVersion: 'refund-engine-v1',
  };
};

const calculateEarlyCheckoutRefund = ({
  rule,
  parkingAmount,
  paidTotal,
  actualParkingCharge,
}) => {
  const normalized = normalizeRule(rule);
  const parkingBase = clampMoney(parkingAmount, paidTotal);
  const actualCharge = clampMoney(actualParkingCharge);
  const unusedParkingValue = Math.max(parkingBase - actualCharge, 0);
  let preliminaryParkingRefund = 0;

  if (normalized.earlyCheckout.mode === 'actual_usage') {
    preliminaryParkingRefund = unusedParkingValue;
  } else if (normalized.earlyCheckout.mode === 'fixed_refund_percent') {
    preliminaryParkingRefund = clampMoney(
      (unusedParkingValue * normalized.earlyCheckout.fixedRefundPercent) / 100,
      unusedParkingValue
    );
  }

  const feeAmount = clampMoney(
    (preliminaryParkingRefund * normalized.earlyCheckout.feePercent) / 100,
    preliminaryParkingRefund
  );
  const parkingRefund = preliminaryParkingRefund - feeAmount;
  const refundAmount = clampMoney(parkingRefund, paidTotal);

  return {
    eventType: 'early_checkout',
    refundAmount,
    extraAmount: Math.max(actualCharge - parkingBase, 0),
    parkingRefund,
    unusedParkingValue,
    actualParkingCharge: actualCharge,
    refundableServiceAmount: 0,
    feeAmount,
    earlyCheckoutMode: normalized.earlyCheckout.mode,
    serviceLines: [],
    calculationVersion: 'refund-engine-v1',
  };
};

const applyMinimumBillableMinutes = (intervals, minimumBillableMinutes, asOf = new Date()) => {
  const normalized = (intervals || [])
    .map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) }))
    .filter(
      (interval) =>
        !Number.isNaN(interval.start.getTime()) &&
        !Number.isNaN(interval.end.getTime()) &&
        interval.start < interval.end
    )
    .sort((left, right) => left.start - right.start);

  if (!normalized.length || minimumBillableMinutes <= 0) return normalized;

  const mergeIntervals = (items) => {
    const merged = [];
    for (const interval of items) {
      const previous = merged[merged.length - 1];
      if (previous && interval.start <= previous.end) {
        if (interval.end > previous.end) previous.end = new Date(interval.end);
      } else {
        merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
      }
    }
    return merged;
  };

  let billable = mergeIntervals(normalized);
  const minimumMs = minimumBillableMinutes * 60 * 1000;
  let totalMs = billable.reduce((sum, interval) => sum + (interval.end - interval.start), 0);

  while (totalMs < minimumMs) {
    billable[0].end = new Date(billable[0].end.getTime() + (minimumMs - totalMs));
    billable = mergeIntervals(billable);
    totalMs = billable.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
  }

  return billable;
};

module.exports = {
  applyMinimumBillableMinutes,
  calculateCancellationRefund,
  calculateEarlyCheckoutRefund,
  calculateNoShowRefund,
  calculateServiceRefund,
  normalizeRule,
  selectCancellationTier,
};
