const isEnabled = (name, defaultValue = false) => {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const defaultForCurrentEnvironment = () => process.env.NODE_ENV !== 'production';

module.exports = {
  isEnabled,
  defaultForCurrentEnvironment,
};
