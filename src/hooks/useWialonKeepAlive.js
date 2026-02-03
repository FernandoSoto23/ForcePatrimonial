import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export default function useWialonKeepAlive() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    console.log("✅ Wialon KeepAlive iniciado...");

    const interval = setInterval(
      async () => {
        try {
          const res = await fetch(`${API_URL}/auth/wialon/renew`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Si Wialon mata el SID → logout automático
          if (!res.ok) {
            console.warn("⚠️ Sesión Wialon expirada, logout...");

            localStorage.removeItem("token");
            window.location.href = "/login";
          }
        } catch (err) {
          console.error("❌ Error en keepalive:", err);
        }
      },
      5 * 60 * 1000,
    ); // cada 5 minutos

    return () => clearInterval(interval);
  }, []);
}
