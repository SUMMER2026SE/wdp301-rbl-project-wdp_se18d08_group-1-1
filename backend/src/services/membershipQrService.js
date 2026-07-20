const crypto = require('crypto');
const mongoose = require('mongoose');

const QR_PREFIX = 'VALO_MEMBERSHIP';
const ACCOUNT_QR_PREFIX = 'VALO_MEMBERSHIP_ACCOUNT';
const DEFAULT_QR_VERSION = 1;

const invalidQrError = (message = 'Invalid membership QR code') =>
  Object.assign(new Error(message), { statusCode: 400 });

const getSecret = () => {
  const secret =
    process.env.MEMBERSHIP_QR_SECRET ||
    process.env.BOOKING_QR_SECRET ||
    process.env.QR_SIGNING_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw Object.assign(new Error('Membership QR signing secret is not configured'), {
      statusCode: 500,
    });
  }
  return secret;
};

const sign = (prefix, id, version) =>
  crypto
    .createHmac('sha256', getSecret())
    .update(`${prefix}:${version}:${id}`)
    .digest('base64url');

const getVersion = (value) => {
  const version = Number(value || DEFAULT_QR_VERSION);
  if (!Number.isSafeInteger(version) || version < 1 || version > 1_000_000_000) {
    throw invalidQrError();
  }
  return version;
};

const buildMembershipQrPayload = (subscription) => {
  const subscriptionId = String(subscription?._id || subscription);
  const version = getVersion(subscription?.qrVersion);
  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    throw Object.assign(new Error('Invalid subscription ID'), { statusCode: 400 });
  }
  return `${QR_PREFIX}:${version}:${subscriptionId}:${sign(QR_PREFIX, subscriptionId, version)}`;
};

const buildAccountMembershipQrPayload = (user) => {
  const userId = String(user?._id || user);
  const version = getVersion(user?.membership?.qrVersion);
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { statusCode: 400 });
  }
  return `${ACCOUNT_QR_PREFIX}:${version}:${userId}:${sign(ACCOUNT_QR_PREFIX, userId, version)}`;
};

const parsePayload = (payload, expectedPrefix, idKey) => {
  if (typeof payload !== 'string' || payload.length > 512) throw invalidQrError();
  const [prefix, rawVersion, id, signature, ...extra] = payload.trim().split(':');
  const version = Number(rawVersion);
  if (
    extra.length > 0 ||
    prefix !== expectedPrefix ||
    rawVersion === '' ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    version > 1_000_000_000 ||
    !mongoose.Types.ObjectId.isValid(id) ||
    !signature
  ) {
    throw invalidQrError();
  }

  const expected = Buffer.from(sign(expectedPrefix, id, version));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw invalidQrError('Membership QR signature is invalid');
  }
  return { [idKey]: id, version };
};

const parseAndVerifyMembershipQr = (payload) =>
  parsePayload(payload, QR_PREFIX, 'subscriptionId');

const parseAndVerifyAnyMembershipQr = (payload) => {
  if (typeof payload !== 'string' || payload.length > 512) throw invalidQrError();
  if (!payload.trim().startsWith(`${ACCOUNT_QR_PREFIX}:`)) {
    return { credentialType: 'LEGACY_SUBSCRIPTION', ...parseAndVerifyMembershipQr(payload) };
  }
  return {
    credentialType: 'ACCOUNT',
    ...parsePayload(payload, ACCOUNT_QR_PREFIX, 'userId'),
  };
};

const isMembershipQrAvailable = (subscription, now = new Date()) =>
  Boolean(
    subscription &&
    subscription.status === 'active' &&
    subscription.paymentStatus === 'paid' &&
    new Date(subscription.expireAt) > now,
  );

module.exports = {
  ACCOUNT_QR_PREFIX,
  QR_PREFIX,
  buildAccountMembershipQrPayload,
  buildMembershipQrPayload,
  createMembershipQrPayload: buildAccountMembershipQrPayload,
  isMembershipQrAvailable,
  parseAndVerifyAnyMembershipQr,
  parseAndVerifyMembershipQr,
};
