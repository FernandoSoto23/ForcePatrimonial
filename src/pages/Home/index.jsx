import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";

export default function Home() {
  const [units, setUnits] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const metrics = [
    {
      title: "Unidades Totales",
      subtitle: "Total registradas en Wialon",
      value: units.total,
      color: "#2563eb",
    },
    {
      title: "Unidades Activas",
      subtitle: "Reportando datos activos",
      value: units.active,
      color: "#16a34a",
    },
    {
      title: "Unidades Inactivas",
      subtitle: "Sin conexión reciente",
      value: units.inactive,
      color: "#dc2626",
    },
    {
      title: "Estado Wialon",
      subtitle: "Conexión API",
      value: "Conectado", // lo vemos en el siguiente paso
      color: "#16a34a",
      status: true,
    },
  ];

  const incidencias = [
    { tipo: "DESVÍO", count: 1240 },
    { tipo: "PÁNICO", count: 820 },
    { tipo: "SIN GPS", count: 310 },
    { tipo: "SIN RED", count: 420 },
  ];
  useEffect(() => {
    async function loadUnits() {
      const res = await apiFetch("http://localhost:4000/unidad/wialon/summary");

      if (!res) return; // apiFetch ya manejó el 401

      const data = await res.json();

      if (data.ok) {
        setUnits({
          total: data.totalUnits ?? 0,
          active: data.countActive ?? 0,
          inactive: data.countInactive ?? 0,
        });
      }
    }

    loadUnits();
  }, []);

  useEffect(() => {
    async function loadUnidades() {
      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          console.warn("No hay token");
          return;
        }

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

        const res = await fetch(`${API_URL}/unidad/unidades`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Error de autorización");
        }

        const data = await res.json();
        console.log("Unidades:", data);

        if (data.ok) {
          // 👉 2️⃣ Guardar SOLO una vez en localStorage
          const alreadySaved = localStorage.getItem("wialon_units");

          if (!alreadySaved) {
            localStorage.setItem(
              "wialon_units",
              JSON.stringify(data.unidades ?? [])
            );
            console.log("💾 Unidades guardadas en localStorage");
          }
        }
      } catch (err) {
        console.error("Error cargando unidades", err);
      }
    }

    loadUnidades();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard General
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen operativo de unidades, estado de conexión y accesos rápidos.
          </p>
        </div>

        {/* METRICS ROW */}

        <div className="grid grid-cols-4 gap-6 mb-10">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* ALERTAS */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">
                  Alertas recientes
                </h2>
                <p className="text-xs text-gray-500">
                  Eventos activos en tiempo real
                </p>
              </div>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full font-semibold">
                LIVE
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-auto">
              {[1, 2, 3].map((_, i) => (
                <div
                  key={i}
                  className="bg-blue-50 border border-blue-100 rounded-lg p-3"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">03:05 a.m.</span>
                    <span className="bg-blue-100 text-blue-700 px-2 rounded-full font-semibold">
                      DESVÍO
                    </span>
                  </div>
                  <p className="text-sm">
                    <strong>Unidad ITM M002849</strong> — Desvío de ruta
                    detectado.
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/casos"
              className="block mt-4 text-sm text-blue-700 font-semibold text-center hover:underline"
            >
              Ver todas las alertas →
            </Link>
          </div>

          {/* INCIDENCIAS */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-800 mb-2">
              Incidencias por tipo
            </h2>
            <p className="text-xs text-gray-500 mb-3">Últimos 10 minutos</p>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidencias}>
                  <XAxis dataKey="tipo" fontSize={11} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SHORTCUTS */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Atajos rápidos
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Shortcut label="Mapa" to="/mapa" icon="🛰" />
          <Shortcut label="Incidencias" to="/incidencias" icon="⚠️" />
          <Shortcut label="Dispositivos" to="/dispositivos" icon="📦" />
          <Shortcut label="Casos" to="/casos" icon="📁" />
          <Shortcut label="Historial" to="/historial" icon="🕘" />
          <Shortcut label="Geocercas" to="/geocercas" icon="📍" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, subtitle, value, color, status }) {
  const chartData = status ? null : [{ value: 75 }, { value: 25 }];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col transition hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>

        {!status && (
          <div className="w-16 h-16">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={20}
                  outerRadius={28}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill={color} />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-3xl font-extrabold tracking-tight" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Shortcut({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 transition hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="text-3xl text-gray-500 group-hover:text-blue-600 transition">
        {icon}
      </div>

      <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition">
        {label}
      </p>
    </Link>
  );
}
