const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');

const {
  BOOKING_SHORTFALL_PURPOSE,
  topUpValidator,
} = require('../validators/walletValidator');

const validateTopUp = async (body) => {
  const req = { body };
  for (const validation of topUpValidator) {
    await validation.run(req);
  }
  return validationResult(req);
};

test('allows an exact booking shortfall below the normal top-up minimum', async () => {
  const result = await validateTopUp({
    amount: 7000,
    purpose: BOOKING_SHORTFALL_PURPOSE,
  });

  assert.equal(result.isEmpty(), true);
});

test('keeps the 10,000 VND minimum for regular wallet top-ups', async () => {
  const belowMinimum = await validateTopUp({ amount: 7000 });
  const minimum = await validateTopUp({ amount: 10000 });

  assert.equal(belowMinimum.isEmpty(), false);
  assert.equal(minimum.isEmpty(), true);
});

test('rejects invalid, zero, and over-limit booking shortfalls', async () => {
  const invalidPurpose = await validateTopUp({ amount: 7000, purpose: 'other' });
  const zero = await validateTopUp({
    amount: 0,
    purpose: BOOKING_SHORTFALL_PURPOSE,
  });
  const overLimit = await validateTopUp({
    amount: 10000001,
    purpose: BOOKING_SHORTFALL_PURPOSE,
  });

  assert.equal(invalidPurpose.isEmpty(), false);
  assert.equal(zero.isEmpty(), false);
  assert.equal(overLimit.isEmpty(), false);
});
