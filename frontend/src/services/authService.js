/**
 * Authentication service — all API calls related to auth.
 * Import individual functions instead of pasting fetch() everywhere in components.
 */

import { apiFetch } from './api';

/** POST /api/auth/login */
export const loginUser = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

/** POST /api/auth/register */
export const registerUser = (username, email, password, confirmPassword) =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, confirmPassword }),
  });

/** POST /api/auth/google  (expects Google ID token) */
export const loginWithGoogle = (idToken) =>
  apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

/** POST /api/auth/send-otp */
export const sendOTP = (email) =>
  apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

/** POST /api/auth/verify-otp */
export const verifyOTP = (email, otp) =>
  apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });

/** POST /api/auth/refresh-token */
export const refreshAccessToken = (refreshToken) =>
  apiFetch('/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

/** POST /api/auth/logout  (protected — reads token from localStorage) */
export const logoutUser = () =>
  apiFetch('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

/** GET /api/auth/me  (protected) */
export const getMe = () =>
  apiFetch('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

/** POST /api/auth/forgot-password — send reset OTP to email */
export const forgotPassword = (email) =>
  apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

/** POST /api/auth/reset-password — verify OTP + set new password */
export const resetPassword = (email, otp, newPassword) =>
  apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
