import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import AuthSuccess from "../pages/AuthSuccess";
import AppLayout from "../layouts/AppLayout";
import RequireAuth from "./RequireAuth";
import PublicRoute from "./PublicRoute";

import Home from "../pages/Home";
import Casos from "../pages/Casos";
import Casosv2 from "../pages/Casosv2";
import Dispositivos from "../pages/Dispositivos";
import MonitoreoPro from "../pages/MonitoreoPro";
import GlobalTrack from "../pages/GlobalTrack";
import SeguridadInterna from "../pages/SeguridadInterna";


export default function AppRouter() {
  return (
    <Routes>
      {/* =========================
         PÚBLICAS (NO logueado)
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
        <Route path="/home" element={<Home />} />
        <Route path="/casos" element={<Casos />} />
        <Route path="/casosv2" element={<Casosv2 />} />
        <Route path="/dispositivos" element={<Dispositivos />} />
        <Route path="/monitoreopro" element={<MonitoreoPro />} />
        <Route path="/globaltrack" element={<GlobalTrack />} />
         <Route path="/seguridadinterna" element={<SeguridadInterna />} />
      </Route>

      {/* =========================
         REDIRECCIONES
      ========================= */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
