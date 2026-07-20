const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBookingQrPayload,
  getAllowedStaffActions,
  isBookingQrAvailable,
  parseAndVerifyBookingQr,
} = require('../services/bookingQrService');

process.env.BOOKING_QR_SECRET = 'test-booking-qr-secret';

const bookingId = '507f1f77bcf86cd799439011';

test('builds and verifies a booking-bound QR payload', () => {
  const payload = buildBookingQrPayload({
    _id: bookingId,
    qrVersion: 1,
  });

  assert.deepEqual(parseAndVerifyBookingQr(payload), {
    bookingId,
    version: 1,
  });
});

test('supports rotating a booking QR by incrementing its credential version', () => {
  const payload = buildBookingQrPayload({
    _id: bookingId,
    qrVersion: 2,
  });

  assert.deepEqual(parseAndVerifyBookingQr(payload), {
    bookingId,
    version: 2,
  });
});

test('rejects a QR payload with a tampered booking ID', () => {
  const payload = buildBookingQrPayload(bookingId);
  const tampered = payload.replace(bookingId, '507f191e810c19729de860ea');

  assert.throws(
    () => parseAndVerifyBookingQr(tampered),
    /signature is invalid/
  );
});

test('only exposes QR codes and staff actions for lifecycle-active states', () => {
  assert.equal(isBookingQrAvailable({ status: 'PAID' }), true);
  assert.equal(isBookingQrAvailable({ status: 'ACTIVE' }), true);
  assert.equal(isBookingQrAvailable({ status: 'COMPLETED' }), false);
  assert.deepEqual(getAllowedStaffActions({ status: 'PAID' }), ['CHECK_IN']);
  assert.deepEqual(getAllowedStaffActions({ status: 'ACTIVE' }), ['CHECK_OUT']);
  assert.deepEqual(getAllowedStaffActions({ status: 'CANCELLED' }), []);
});
