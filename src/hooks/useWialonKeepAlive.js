import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function useWialonKeepAlive() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    console.log("✅ Wialon KeepAlive iniciado...");

    const interval = setInterval(async () => {
      try {
        console.log("🔄 KeepAlive ejecutando ping...");

        const res = await fetch(`${API_URL}/auth/wialon/renew`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("⚠️ Sesión Wialon expirada, logout...");

          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        } else {
          console.log("✅ SID sigue vivo");
        }
      } catch (err) {
        console.error("❌ Error en keepalive:", err);
      }
    }, 120 * 1000); // ✅ cada 10 segundos (TEST)

    return () => clearInterval(interval);
  }, []);
}
