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
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import Shortcut from "./components/ShortCut";
import MetricCard from "./components/MetricCard";
import { useLiveAlerts } from "../../hooks/useLiveAlerts";
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
  const alerts = useLiveAlerts(10);
  const incidencias = [
    { tipo: "DESVÍO", count: 1240 },
    { tipo: "PÁNICO", count: 820 },
    { tipo: "SIN GPS", count: 310 },
    { tipo: "SIN RED", count: 420 },
  ];
  useEffect(() => {
    async function loadUnits() {
      const res = await apiFetch("https://apipx.onrender.com/unidad/wialon/summary");

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

        <div className="
  grid
  grid-cols-4
  gap-6
  mb-10
  max-[1023px]:grid-cols-2
  max-[639px]:grid-cols-1
">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-xl shadow-sm border mb-10">
          {/* GRID INTERNO OBLIGATORIO */}
          <div className="grid grid-cols-2  max-[1023px]:grid-cols-1">

            {/* PANEL ALERTAS (ESTILO LEGACY) */}
            <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[420px]">

              {/* ALERTAS RECIENTES – LEGACY STYLE */}
              <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[420px]">

                {/* HEADER */}
                <div className="flex justify-between items-center px-6 py-4 border-b">
                  <div>
                    <h2 className="font-semibold text-gray-800 text-sm">
                      Alertas recientes
                    </h2>
                    <p className="text-xs text-gray-500">Feed activo</p>
                  </div>

                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                    LIVE
                  </span>
                </div>

                {/* LISTADO */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {alerts.map((a, i) => (
                    <div
                      key={i}
                      className="
          relative
          bg-blue-50
          border border-blue-100
          rounded-lg
          p-4
          pl-6
        "
                    >
                      {/* BARRA IZQUIERDA */}
                      <span className="absolute left-0 top-0 h-full w-1 bg-blue-600 rounded-l-lg" />

                      {/* HEADER */}
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="w-2 h-2 bg-blue-600 rounded-full" />
                          {a.hora}
                        </div>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {a.tipo}
                        </span>
                      </div>

                      {/* CONTENIDO */}
                      <div className="text-sm text-gray-800 leading-snug">
                        <strong className="text-blue-700">
                          Unidad {a.unidad}
                        </strong>{" "}
                        —{" "}
                        <span className="text-gray-700 line-clamp-2">
                          {a.mensaje}
                        </span>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-10">
                      Sin alertas activas
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <Link
                  to="/casos"
                  className="text-center text-sm font-semibold text-blue-700 py-3 border-t hover:bg-gray-50"
                >
                  Ver todas →
                </Link>
              </div>


            </div>


            {/* ================= INCIDENCIAS ================= */}
            <div className="flex flex-col">
              {/* HEADER */}
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800">
                  Incidencias por tipo
                </h2>
                <p className="text-xs text-gray-500">
                  Últimos 10 minutos
                </p>
              </div>

              {/* CHART */}
              <div className="flex-1 p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidencias}>
                      <XAxis dataKey="tipo" fontSize={11} />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
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




