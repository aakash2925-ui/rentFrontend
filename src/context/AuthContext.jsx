"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rent_token");
    const storedUser = localStorage.getItem("rent_user");
    if (token && storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("rent_token", data.token);
    localStorage.setItem("rent_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential) => {
    let sessionId = sessionStorage.getItem("google_login_email_session");
    if (!sessionId) {
      sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("google_login_email_session", sessionId);
    }
    const { data } = await api.post("/auth/google", { credential, sessionId });
    localStorage.setItem("rent_token", data.token);
    localStorage.setItem("rent_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("rent_token", data.token);
    localStorage.setItem("rent_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("rent_token");
    localStorage.removeItem("rent_user");
    setUser(null);
  };

  const updateUser = (nextUser) => {
    localStorage.setItem("rent_user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const value = useMemo(() => ({ user, loading, login, googleLogin, register, logout, updateUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
