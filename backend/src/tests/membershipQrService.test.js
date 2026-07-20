const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.MEMBERSHIP_QR_SECRET = 'test-membership-qr-secret';

const {
  buildAccountMembershipQrPayload,
  buildMembershipQrPayload,
  isMembershipQrAvailable,
  parseAndVerifyAnyMembershipQr,
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

test('builds an account membership QR and rejects an old rotated version', () => {
  const userId = new mongoose.Types.ObjectId();
  const payload = buildAccountMembershipQrPayload({
    _id: userId,
    membership: { qrVersion: 4 },
  });
  assert.deepEqual(parseAndVerifyAnyMembershipQr(payload), {
    credentialType: 'ACCOUNT',
    userId: String(userId),
    version: 4,
  });
  assert.match(payload, /^VALO_MEMBERSHIP_ACCOUNT:4:/);
});

test('generic membership parser keeps legacy subscription QR compatibility', () => {
  const subscription = {
    _id: new mongoose.Types.ObjectId(),
    qrVersion: 2,
  };
  const parsed = parseAndVerifyAnyMembershipQr(buildMembershipQrPayload(subscription));
  assert.equal(parsed.credentialType, 'LEGACY_SUBSCRIPTION');
  assert.equal(parsed.subscriptionId, String(subscription._id));
  assert.equal(parsed.version, 2);
});
