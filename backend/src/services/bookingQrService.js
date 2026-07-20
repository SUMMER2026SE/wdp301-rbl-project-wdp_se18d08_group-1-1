const crypto = require('crypto');
const mongoose = require('mongoose');

const PREFIX = 'VALO_BOOKING';
const VERSION = '1';
const AVAILABLE_STATUSES = new Set(['PAID', 'ACTIVE', 'PAUSED']);

const getSecret = () => {
  const secret = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('QR signing secret is not configured');
  return secret;
};

const sign = (unsignedPayload) => crypto
  .createHmac('sha256', getSecret())
  .update(unsignedPayload)
  .digest('base64url');

const createBookingQrPayload = (bookingId) => {
  const unsignedPayload = `${PREFIX}:${VERSION}:${String(bookingId)}`;
  return `${unsignedPayload}:${sign(unsignedPayload)}`;
};

const parseAndVerifyBookingQr = (payload) => {
  const parts = typeof payload === 'string' ? payload.split(':') : [];
  if (parts.length !== 4 || parts[0] !== PREFIX || parts[1] !== VERSION) return null;
  const [, , bookingId, signature] = parts;
  if (!mongoose.isValidObjectId(bookingId)) return null;
  const expected = sign(`${PREFIX}:${VERSION}:${bookingId}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return { bookingId, version: VERSION };
};

const buildBookingQrData = (booking) => {
  const bookingStatus = String(booking.status || '').toUpperCase();
  if (!AVAILABLE_STATUSES.has(bookingStatus)) {
    return {
      available: false,
      bookingStatus,
      payload: null,
      reason: 'This QR code is not available for the current booking status.',
    };
  }

  return {
    available: true,
    bookingStatus,
    payload: createBookingQrPayload(booking._id),
    reason: null,
  };
};

module.exports = {
  buildBookingQrData,
  createBookingQrPayload,
  parseAndVerifyBookingQr,
};
