import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { getAuthToken, setAuthToken } from '../api/apiClient';
import type { LoginResponse, Role, User } from '../types/auth';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  selectRole: (role: Role, approvalRolePassword?: string) => Promise<User>;
  switchRole: (role: Role, approvalRolePassword?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(Boolean(getAuthToken()));

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    try {
      const nextUser = await authApi.me();
      setUser(nextUser);
      setToken(currentToken);
    } catch {
      setAuthToken(undefined);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setAuthToken(response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const selectRole = useCallback(async (role: Role, approvalRolePassword?: string) => {
    const response = await authApi.selectRole(role, approvalRolePassword);
    setAuthToken(response.token);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout should still clear the development token.
    }
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, selectRole, switchRole: selectRole, logout, refreshUser }),
    [user, token, isLoading, login, selectRole, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
