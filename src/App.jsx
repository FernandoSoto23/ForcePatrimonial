import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import "mapbox-gl/dist/mapbox-gl.css";
export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const location = useLocation();

  const publicRoutes = ["/login", "/auth/success"];

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setSessionReady(!!token);
  }, []);

  // ✅ SI estoy en ruta pública, NO bloquear
  if (publicRoutes.includes(location.pathname)) {
    return <AppRouter />;
  }

  // ⛔ SOLO bloquear rutas privadas
  if (!sessionReady) {
    return <div>Cargando sesión…</div>;
  }

  return <AppRouter />;
}
