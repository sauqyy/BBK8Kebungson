import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("token")) return;
    client
      .get("/auth/me")
      .then(({ data }) => {
        sessionStorage.setItem("user", JSON.stringify(data));
        setUser(data);
      })
      .catch(() => {});
  }, []);

  async function login(username, password) {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.post("/auth/login", { username, password });
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Gagal masuk, coba lagi.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  }

  function updateUser(newUser) {
    sessionStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
