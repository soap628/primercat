"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, logoutApi, getMe, AuthUser, AuthToken } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function _applyUser(data: AuthToken) {
    setUser(data.user);
  }

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    _applyUser(data);
  }

  async function register(email: string, password: string, displayName?: string) {
    const data = await apiRegister(email, password, displayName);
    _applyUser(data);
  }

  async function logout() {
    await logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
