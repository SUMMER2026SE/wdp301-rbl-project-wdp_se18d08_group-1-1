const test = require('node:test');
const assert = require('node:assert/strict');

process.env.MEMBERSHIP_QR_SECRET = 'test-membership-qr-secret';

const {
  buildMembershipQrPayload,
  isMembershipQrAvailable,
  parseAndVerifyMembershipQr,
} = require('../services/membershipQrService');

const subscriptionId = '507f1f77bcf86cd799439011';

test('builds and verifies a reusable membership QR payload', () => {
  const payload = buildMembershipQrPayload({
    _id: subscriptionId,
    qrVersion: 1,
  });

  assert.deepEqual(parseAndVerifyMembershipQr(payload), {
    subscriptionId,
    version: 1,
  });
});

test('supports revoking a membership QR by rotating its version', () => {
  const payload = buildMembershipQrPayload({
    _id: subscriptionId,
    qrVersion: 2,
  });

  assert.equal(parseAndVerifyMembershipQr(payload).version, 2);
});

test('rejects a tampered membership QR payload', () => {
  const payload = buildMembershipQrPayload(subscriptionId);
  const tampered = payload.replace(subscriptionId, '507f191e810c19729de860ea');

  assert.throws(
    () => parseAndVerifyMembershipQr(tampered),
    /signature is invalid/
  );
});

test('only exposes QR while membership is paid, active, and unexpired', () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  assert.equal(
    isMembershipQrAvailable({
      status: 'active',
      paymentStatus: 'paid',
      expireAt: future,
    }),
    true
  );
  assert.equal(
    isMembershipQrAvailable({
      status: 'expired',
      paymentStatus: 'paid',
      expireAt: future,
    }),
    false
  );
  assert.equal(
    isMembershipQrAvailable({
      status: 'active',
      paymentStatus: 'paid',
      expireAt: past,
    }),
    false
  );
});
