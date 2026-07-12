export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPassword = (password: string) => password.length >= 8;

export const isValidOtp = (otp: string) => /^\d{6}$/.test(otp);

export const isValidLicensePlate = (value: string) => /^[A-Z0-9-.\s]{5,15}$/i.test(value.trim());
