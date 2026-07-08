import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/services/api/client';
import { authService } from '@/services/api/auth';
import { tokenStorage } from '@/services/storage/tokenStorage';
import type { GoogleLoginRequest, LoginRequest, RegisterRequest } from '@/types/api';
import type { User } from '@/types/models';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (data: GoogleLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await authService.getMe();
    setUser(response.data.user);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const hasTokens = await tokenStorage.hasValidTokens();

      if (hasTokens) {
        await refreshUser();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[Auth] initialize failed:', error);
      }
      await tokenStorage.clearTokens();
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, refreshUser]);

  useEffect(() => {
    apiClient.setLogoutHandler(clearAuthState);
    void initializeAuth();
  }, [clearAuthState, initializeAuth]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      await tokenStorage.saveTokens(response.data);
      setUser(response.data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      await tokenStorage.saveTokens(response.data);
      setUser(response.data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (data: GoogleLoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.googleLogin(data);
      await tokenStorage.saveTokens(response.data);
      setUser(response.data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    setIsLoading(true);
    try {
      await authService.logout(refreshToken);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Auth] logout API failed:', error);
      }
    } finally {
      await tokenStorage.clearTokens();
      clearAuthState();
      setIsLoading(false);
    }
  }, [clearAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      googleLogin,
      logout,
      refreshUser,
    }),
    [googleLogin, isLoading, login, logout, refreshUser, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
