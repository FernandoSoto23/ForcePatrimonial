import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

const UnitsContext = createContext(null);

export function UnitsProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUnits = async ({ silent = false } = {}) => {
    let toastId;

    if (!silent) {
      toastId = toast.loading("📦 Cargando unidades...");
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("UNAUTHORIZED");

      const res = await fetch("https://apipx.onrender.com/unidad/unidades", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.unidades)) {
        list = data.unidades;
      } else {
        throw new Error("Formato inesperado de unidades");
      }

      setUnits(list);
      setError(null);

      if (!silent) {
        toast.update(toastId, {
          render: `✅ ${list.length} unidades cargadas`,
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (err) {
      console.error("❌ Error cargando unidades:", err);
      setUnits([]);
      setError(err.message);

      // 🔐 LOGOUT AUTOMÁTICO
      // 🔐 LOGOUT AUTOMÁTICO (excepto en /login)
      if (err.message === "UNAUTHORIZED") {
        const isLoginPage = window.location.pathname === "/login";

        if (!isLoginPage) {
          toast.error("⚠️ Tu sesión expiró. Inicia sesión nuevamente.");

          setTimeout(() => {
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
          }, 1500);
        }

        return;
      }

      if (!silent) {
        toast.update(toastId, {
          render: `❌ Error: ${err.message}`,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /* 🔥 CARGA INICIAL */
  useEffect(() => {
    fetchUnits();
  }, []);

  return (
    <UnitsContext.Provider
      value={{
        units,
        loading,
        error,
        refreshUnits: fetchUnits,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

/* ======================
   HOOK
====================== */
export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) {
    throw new Error("useUnits debe usarse dentro de UnitsProvider");
  }
  return ctx;
}
