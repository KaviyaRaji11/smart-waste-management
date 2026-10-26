import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const clear = () => {
      localStorage.removeItem("swm_token");
      localStorage.removeItem("swm_user");
      if (!cancelled) setUser(null);
    };

    const restore = async () => {
      const token = localStorage.getItem("swm_token");
      if (!token) {
        clear();
        setLoading(false);
        return;
      }
      try {
        // Confirm with the server that the saved token is still valid
        const { data } = await api.get("/auth/me");
        localStorage.setItem("swm_user", JSON.stringify(data.user));
        if (!cancelled) setUser(data.user);
      } catch (err) {
        // 401 => stale token; network error => keep nothing half-logged-in
        clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restore();

    const onExpired = () => setUser(null);
    window.addEventListener("swm:session-expired", onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener("swm:session-expired", onExpired);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email: email.trim(), password });
    localStorage.setItem("swm_token", data.token);
    localStorage.setItem("swm_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, role) => {
    const { data } = await api.post("/auth/register", { name: name.trim(), email: email.trim(), password, role });
    localStorage.setItem("swm_token", data.token);
    localStorage.setItem("swm_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("swm_token");
    localStorage.removeItem("swm_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
