import React, { createContext, useCallback, useContext, useState } from 'react';

import { type User } from '../api/auth.api';
import { setAuthToken } from '../api/axiosClient';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  login: () => {},
  logout: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = useCallback((newUser: User, token: string) => {
    setUser(newUser);
    setAccessToken(token);
    setAuthToken(token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext);
