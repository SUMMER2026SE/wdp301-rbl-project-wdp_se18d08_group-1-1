const DEFAULT_CLIENT_URL = 'http://localhost:5173';

const appendPaymentParams = (baseUrl, orderCode, { cancelled = false } = {}) => {
  const url = new URL(baseUrl);
  url.searchParams.set('orderCode', String(orderCode));
  if (cancelled) {
    url.searchParams.set('cancel', 'true');
  } else {
    url.searchParams.delete('cancel');
  }
  return url.toString();
};

const buildSubscriptionPaymentUrls = (orderCode, env = process.env) => {
  const clientUrl = String(env.CLIENT_URL || DEFAULT_CLIENT_URL).replace(/\/+$/, '');
  const returnBaseUrl =
    env.PAYOS_SUBSCRIPTION_RETURN_URL || `${clientUrl}/membership`;
  const cancelBaseUrl =
    env.PAYOS_SUBSCRIPTION_CANCEL_URL || `${clientUrl}/membership`;

  return {
    returnUrl: appendPaymentParams(returnBaseUrl, orderCode),
    cancelUrl: appendPaymentParams(cancelBaseUrl, orderCode, { cancelled: true }),
  };
};

module.exports = {
  buildSubscriptionPaymentUrls,
};
