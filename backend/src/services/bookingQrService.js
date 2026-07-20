const crypto = require('crypto');
const mongoose = require('mongoose');

const QR_PREFIX = 'VALO_BOOKING';
const QR_VERSION = 1;
const QR_ACTIVE_STATUSES = new Set(['PAID', 'ACTIVE', 'PAUSED']);

const getSecret = () => {
  const secret = process.env.BOOKING_QR_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw Object.assign(new Error('Booking QR signing secret is not configured'), {
      statusCode: 500,
    });
  }
  return secret;
};

const sign = (bookingId, version = QR_VERSION) =>
  crypto
    .createHmac('sha256', getSecret())
    .update(`${QR_PREFIX}:${version}:${bookingId}`)
    .digest('base64url');

const buildBookingQrPayload = (booking) => {
  const bookingId = String(booking?._id || booking);
  const version = Number(booking?.qrVersion || QR_VERSION);

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw Object.assign(new Error('Invalid booking ID'), { statusCode: 400 });
  }

  return `${QR_PREFIX}:${version}:${bookingId}:${sign(bookingId, version)}`;
};

const parseAndVerifyBookingQr = (payload) => {
  if (typeof payload !== 'string' || payload.length > 512) {
    throw Object.assign(new Error('Invalid booking QR code'), { statusCode: 400 });
  }

  const [prefix, rawVersion, bookingId, signature, ...extra] = payload.trim().split(':');
  const version = Number(rawVersion);

  if (
    extra.length > 0 ||
    prefix !== QR_PREFIX ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    version > 1_000_000_000 ||
    !mongoose.Types.ObjectId.isValid(bookingId) ||
    !signature
  ) {
    throw Object.assign(new Error('Invalid booking QR code'), { statusCode: 400 });
  }

  const expected = sign(bookingId, version);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw Object.assign(new Error('Booking QR signature is invalid'), { statusCode: 400 });
  }

  return { bookingId, version };
};

const isBookingQrAvailable = (booking) =>
  Boolean(booking && QR_ACTIVE_STATUSES.has(String(booking.status).toUpperCase()));

const getAllowedStaffActions = (booking) => {
  const status = String(booking?.status || '').toUpperCase();
  if (status === 'PAID') return ['CHECK_IN'];
  if (status === 'ACTIVE') return ['CHECK_OUT'];
  return [];
};

module.exports = {
  QR_ACTIVE_STATUSES,
  buildBookingQrPayload,
  getAllowedStaffActions,
  isBookingQrAvailable,
  parseAndVerifyBookingQr,
};
