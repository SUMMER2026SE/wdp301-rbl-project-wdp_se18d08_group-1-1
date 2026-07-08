import {
  calculatePasswordStrength,
  isValidNormalizedLicensePlate,
  normalizeLicensePlate,
  validateDateOfBirth,
  validateVietnamesePhone,
} from '@/utils/profileValidation';

describe('profile validation utilities', () => {
  it('validates Vietnamese phone numbers', () => {
    expect(validateVietnamesePhone('0912345678')).toBe(true);
    expect(validateVietnamesePhone('1912345678')).toBe(false);
    expect(validateVietnamesePhone('091234567')).toBe(false);
  });

  it('validates date of birth age and future dates', () => {
    expect(validateDateOfBirth('2000-01-01', new Date('2026-07-08')).valid).toBe(true);
    expect(validateDateOfBirth('2027-01-01', new Date('2026-07-08')).valid).toBe(false);
    expect(validateDateOfBirth('2015-01-01', new Date('2026-07-08')).valid).toBe(false);
  });

  it('normalizes and validates license plates', () => {
    expect(normalizeLicensePlate('51a-123.45')).toBe('51A12345');
    expect(isValidNormalizedLicensePlate('51A12345')).toBe(true);
    expect(isValidNormalizedLicensePlate('A')).toBe(false);
  });

  it('calculates password strength', () => {
    expect(calculatePasswordStrength('abc')).toBe('weak');
    expect(calculatePasswordStrength('abcdef1234')).toBe('medium');
    expect(calculatePasswordStrength('Abcdef1234!')).toBe('strong');
  });
});

