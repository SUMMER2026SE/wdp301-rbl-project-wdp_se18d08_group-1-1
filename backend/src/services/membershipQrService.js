const crypto = require('crypto');
const mongoose = require('mongoose');

const QR_PREFIX = 'VALO_MEMBERSHIP';
const DEFAULT_QR_VERSION = 1;

const getSecret = () => {
  const secret =
    process.env.MEMBERSHIP_QR_SECRET ||
    process.env.BOOKING_QR_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw Object.assign(new Error('Membership QR signing secret is not configured'), {
      statusCode: 500,
    });
  }
  return secret;
};

const sign = (subscriptionId, version) =>
  crypto
    .createHmac('sha256', getSecret())
    .update(`${QR_PREFIX}:${version}:${subscriptionId}`)
    .digest('base64url');

const buildMembershipQrPayload = (subscription) => {
  const subscriptionId = String(subscription?._id || subscription);
  const version = Number(subscription?.qrVersion || DEFAULT_QR_VERSION);

  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    throw Object.assign(new Error('Invalid subscription ID'), { statusCode: 400 });
  }

  return `${QR_PREFIX}:${version}:${subscriptionId}:${sign(subscriptionId, version)}`;
};

const parseAndVerifyMembershipQr = (payload) => {
  if (typeof payload !== 'string' || payload.length > 512) {
    throw Object.assign(new Error('Invalid membership QR code'), { statusCode: 400 });
  }

  const [prefix, rawVersion, subscriptionId, signature, ...extra] = payload.trim().split(':');
  const version = Number(rawVersion);
  if (
    extra.length > 0 ||
    prefix !== QR_PREFIX ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    version > 1_000_000_000 ||
    !mongoose.Types.ObjectId.isValid(subscriptionId) ||
    !signature
  ) {
    throw Object.assign(new Error('Invalid membership QR code'), { statusCode: 400 });
  }

  const expected = Buffer.from(sign(subscriptionId, version));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw Object.assign(new Error('Membership QR signature is invalid'), { statusCode: 400 });
  }

  return { subscriptionId, version };
};

const isMembershipQrAvailable = (subscription, now = new Date()) =>
  Boolean(
    subscription &&
    subscription.status === 'active' &&
    subscription.paymentStatus === 'paid' &&
    new Date(subscription.expireAt) > now
  );

module.exports = {
  buildMembershipQrPayload,
  isMembershipQrAvailable,
  parseAndVerifyMembershipQr,
};
