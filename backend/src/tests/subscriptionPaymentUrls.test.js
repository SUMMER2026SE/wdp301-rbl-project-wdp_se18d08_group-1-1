const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSubscriptionPaymentUrls,
} = require('../utils/subscriptionPaymentUrls');

test('subscription payments return to membership instead of wallet callbacks', () => {
  const urls = buildSubscriptionPaymentUrls(123456, {
    CLIENT_URL: 'http://localhost:5173',
    PAYOS_RETURN_URL: 'http://localhost:5173/wallet/top-up/success',
    PAYOS_CANCEL_URL: 'http://localhost:5173/wallet/top-up/cancel',
  });

  assert.equal(
    urls.returnUrl,
    'http://localhost:5173/membership?orderCode=123456'
  );
  assert.equal(
    urls.cancelUrl,
    'http://localhost:5173/membership?orderCode=123456&cancel=true'
  );
});

test('subscription-specific callback URLs are supported', () => {
  const urls = buildSubscriptionPaymentUrls(987654, {
    CLIENT_URL: 'https://app.valoparking.vn',
    PAYOS_SUBSCRIPTION_RETURN_URL:
      'https://app.valoparking.vn/membership?source=payos',
    PAYOS_SUBSCRIPTION_CANCEL_URL:
      'https://app.valoparking.vn/membership?source=payos',
  });

  assert.equal(
    urls.returnUrl,
    'https://app.valoparking.vn/membership?source=payos&orderCode=987654'
  );
  assert.equal(
    urls.cancelUrl,
    'https://app.valoparking.vn/membership?source=payos&orderCode=987654&cancel=true'
  );
});
