const LEGACY_REFUND_RULE = Object.freeze({
  cancellationTiers: Object.freeze([
    Object.freeze({ minimumMinutesBeforeStart: 60, refundPercent: 100 }),
    Object.freeze({ minimumMinutesBeforeStart: 30, refundPercent: 50 }),
    Object.freeze({ minimumMinutesBeforeStart: 0, refundPercent: 0 }),
  ]),
  noShowRefundPercent: 0,
  minimumBillableMinutes: 60,
  earlyCheckout: Object.freeze({
    mode: 'actual_usage',
    fixedRefundPercent: 0,
    feePercent: 0,
  }),
  serviceRefundPercent: Object.freeze({
    pending: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
  }),
});

const cloneLegacyRefundRule = () => JSON.parse(JSON.stringify(LEGACY_REFUND_RULE));

module.exports = {
  LEGACY_REFUND_RULE,
  cloneLegacyRefundRule,
};
