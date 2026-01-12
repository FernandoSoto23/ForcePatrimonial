import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import AuthSuccess from "../pages/AuthSuccess";
import AppLayout from "../layouts/AppLayout";
import RequireAuth from "./RequireAuth";
import PublicRoute from "./PublicRoute";
import Home from "../pages/Home";
import Casos from "../pages/Casos";
import Dispositivos from "../pages/Dispositivos";
import Casosv2 from "../pages/Casosv2";

export default function AppRouter() {
  return (
    <Routes>
      {/* =========================
         PÚBLICAS (solo NO logueado)
      ========================= */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route path="/auth/success" element={<AuthSuccess />} />

      {/* =========================
         PROTEGIDAS
      ========================= */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* HOME */}
        <Route path="/home" element={<Home />} />
        <Route path="/casos" element={<Casos />} />
         <Route path="/casosv2" element={<Casosv2 />} />
        <Route path="/dispositivos" element={<Dispositivos />} />
      </Route>

      {/* =========================
         REDIRECCIONES
      ========================= */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
