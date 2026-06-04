import React, { createContext, useContext, useState } from 'react';
import type { UserClaims } from '@pulse/shared-types';
import { getUserClaims } from '../../lib/auth';

interface AuthContextType {
  token: string | null;
  claims: UserClaims | null;
  userId: string | null;
  role: string | null;
  countryId: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [claims, setClaims] = useState<UserClaims | null>(getUserClaims());

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      setClaims(JSON.parse(jsonPayload) as UserClaims);
    } catch {
      setClaims(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeCountryId');
    setToken(null);
    setClaims(null);
  };

  const userId = claims?.sub ?? null;
  const role = claims?.role ?? null;
  const countryId = claims?.country_id ?? null;

  return (
    <AuthContext.Provider value={{ token, claims, userId, role, countryId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
