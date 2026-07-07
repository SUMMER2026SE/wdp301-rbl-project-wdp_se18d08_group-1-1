import type {
  APIResponse,
  AuthResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RefreshTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyOTPRequest,
} from '@/types/api';
import type { MeResponse } from '@/types/models';

import { apiClient } from './client';

class AuthService {
  login(data: LoginRequest) {
    return apiClient.post<AuthResponse>('/auth/login', data);
  }

  register(data: RegisterRequest) {
    return apiClient.post<AuthResponse>('/auth/register', data);
  }

  googleLogin(data: GoogleLoginRequest) {
    return apiClient.post<AuthResponse>('/auth/google', data);
  }

  refreshToken(refreshToken: string) {
    return apiClient.post<RefreshTokenResponse>('/auth/refresh-token', { refreshToken });
  }

  logout(refreshToken?: string | null) {
    return apiClient.post<APIResponse>('/auth/logout', { refreshToken });
  }

  getMe() {
    return apiClient.get<MeResponse>('/auth/me');
  }

  forgotPassword(data: ForgotPasswordRequest) {
    return apiClient.post<APIResponse>('/auth/forgot-password', data);
  }

  verifyResetOTP(data: VerifyOTPRequest) {
    return apiClient.post<APIResponse>('/auth/verify-reset-otp', data);
  }

  resetPassword(data: ResetPasswordRequest) {
    return apiClient.post<APIResponse>('/auth/reset-password', data);
  }
}

export const authService = new AuthService();
