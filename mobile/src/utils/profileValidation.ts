export const validateVietnamesePhone = (phone: string) => /^0\d{9}$/.test(phone.trim());

export const validateDateOfBirth = (value: string, now = new Date()) => {
  if (!value.trim()) return { valid: true };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { valid: false, error: 'Use YYYY-MM-DD format.' };
  if (date > now) return { valid: false, error: 'Date of birth cannot be in the future.' };
  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) age -= 1;
  if (age < 16) return { valid: false, error: 'You must be at least 16 years old.' };
  return { valid: true };
};

export const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 4) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
};

export const normalizeLicensePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidNormalizedLicensePlate = (value: string) => /^[A-Z0-9]{4,12}$/.test(value);

