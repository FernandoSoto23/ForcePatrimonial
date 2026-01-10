import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("auth_token");
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      setUser(decoded);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("JWT inválido", err);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  return { user, isAuthenticated };
}
