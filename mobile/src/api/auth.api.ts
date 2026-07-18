import axiosClient from './axiosClient';

// ─── Response shapes ───────────────────────────────────────────────────────────
export type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type HealthCheckResponse = {
  status?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
};

// ─── Auth endpoints ────────────────────────────────────────────────────────────

/** POST /auth/login */
export const loginUser = async (email: string, password: string) => {
  const res = await axiosClient.post<{ data: AuthResponse }>('/auth/login', {
    email,
    password,
  });
  return res.data.data;
};

/** POST /auth/google — expects Google ID token */
export const loginWithGoogle = async (idToken: string) => {
  const res = await axiosClient.post<{ data: AuthResponse }>('/auth/google', { idToken });
  return res.data.data;
};

/** POST /auth/register */
export const registerUser = async (
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
) => {
  const res = await axiosClient.post('/auth/register', {
    username,
    email,
    password,
    confirmPassword,
  });
  return res.data;
};

/** POST /auth/send-otp */
export const sendOTP = async (email: string) => {
  const res = await axiosClient.post('/auth/send-otp', { email });
  return res.data;
};

/** POST /auth/verify-otp */
export const verifyOTP = async (email: string, otp: string) => {
  const res = await axiosClient.post('/auth/verify-otp', { email, otp });
  return res.data;
};

/** POST /auth/forgot-password */
export const forgotPassword = async (email: string) => {
  const res = await axiosClient.post('/auth/forgot-password', { email });
  return res.data;
};

/** POST /auth/verify-reset-otp */
export const verifyResetOTP = async (email: string, otp: string) => {
  const res = await axiosClient.post('/auth/verify-reset-otp', { email, otp });
  return res.data;
};

/** POST /auth/reset-password */
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const res = await axiosClient.post('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return res.data;
};

// ─── Health check ──────────────────────────────────────────────────────────────
const HEALTH_ENDPOINT = '/health';

export const testBackendConnection = async () => {
  const response = await axiosClient.get<HealthCheckResponse>(HEALTH_ENDPOINT);
  return response.data;
};
