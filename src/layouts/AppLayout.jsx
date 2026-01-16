import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { useGeocercas } from "../context/GeocercasContext";
import { useGeocercasLineales } from "../context/GeocercasLinealesContext";
import { toast } from "react-toastify";

export default function AppLayout() {
  const { isAuthenticated, user } = useAuth();

  const { ready: geocercasReady } = useGeocercas();
  const { ready: linealesReady } = useGeocercasLineales();

  const toastIdRef = useRef(null);

  /* 🔔 TOAST GLOBAL DE CARGA */
  /*   useEffect(() => {
      // Si aún no existe el toast → créalo
      if (!geocercasReady || !linealesReady) {
        if (!toastIdRef.current) {
          toastIdRef.current = toast.loading(
            "Cargando geocercas y rutas…",
            { closeOnClick: false }
          );
        }
        return;
      }
  
      // Si ya cargaron ambas → actualiza el toast
      if (toastIdRef.current) {
        toast.update(toastIdRef.current, {
          render: "Geocercas y rutas cargadas ✅",
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
        toastIdRef.current = null;
      }
    }, [geocercasReady, linealesReady]); */

  /* 🔐 AUTH (si lo activas después)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  */

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <main className="pt-16 w-full">
        <Outlet />
      </main>
    </div>
  );
}
