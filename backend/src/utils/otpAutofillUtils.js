const DEFAULT_WEB_ORIGIN = 'http://localhost:5173';

const normalizeOrigin = (value) => {
  const rawValue = (value || DEFAULT_WEB_ORIGIN).trim();

  try {
    return new URL(rawValue).origin;
  } catch {
    return rawValue.replace(/\/+$/, '');
  }
};

const getWebOtpOrigin = () => {
  return normalizeOrigin(process.env.OTP_WEB_ORIGIN || process.env.CLIENT_URL);
};

const getWebOtpDomain = () => {
  const origin = getWebOtpOrigin();

  try {
    return new URL(origin).host;
  } catch {
    return origin.replace(/^https?:\/\//, '').split('/')[0];
  }
};

const buildWebOtpLine = (otp) => `@${getWebOtpDomain()} #${otp}`;

const buildWebOtpFormat = () => `@${getWebOtpDomain()} #<OTP>`;

const buildOtpAutofillHint = () => ({
  web: buildWebOtpFormat(),
});

const getOtpAutofillConfig = () => ({
  origin: getWebOtpOrigin(),
  web: {
    domain: getWebOtpDomain(),
    format: buildWebOtpFormat(),
    autocomplete: 'one-time-code',
    inputMode: 'numeric',
    pattern: '[0-9]{6}',
  },
});

module.exports = {
  buildOtpAutofillHint,
  buildWebOtpLine,
  getOtpAutofillConfig,
};
