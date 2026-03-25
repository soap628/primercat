"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, getMe, AuthUser, AuthToken } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("primercat_token");
    if (saved) {
      setToken(saved);
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("primercat_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function _applyToken(data: AuthToken) {
    localStorage.setItem("primercat_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  }

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    _applyToken(data);
  }

  async function register(email: string, password: string, displayName?: string) {
    const data = await apiRegister(email, password, displayName);
    _applyToken(data);
  }

  function logout() {
    localStorage.removeItem("primercat_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
