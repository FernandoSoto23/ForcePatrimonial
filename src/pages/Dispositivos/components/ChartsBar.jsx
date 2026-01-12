
import { useEffect, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function ChartsBar({ units }) {
  // ============================================================
  // LOCALSTORAGE COUNTERS
  // ============================================================
  const loadCriticos = () => {
    try {
      return JSON.parse(localStorage.getItem("casosCriticos") || "[]");
    } catch {
      return [];
    }
  };

  const loadPrioritarios = () => {
    try {
      return JSON.parse(localStorage.getItem("casosGuardados") || "[]");
    } catch {
      return [];
    }
  };

  const [criticos, setCriticos] = useState(0);
  const [prioritarios, setPrioritarios] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setCriticos(loadCriticos().length);
      setPrioritarios(loadPrioritarios().length);
    };

    refresh();
    const int = setInterval(refresh, 5000);
    return () => clearInterval(int);
  }, []);

  // ============================================================
  // ACTIVE / STOPPED
  // ============================================================
  const activos = units.filter((u) => u.pos?.s >= 1).length;
  const detenidos = units.length - activos;

  // Chart colors (corporate)
  const ticksColor = "#6b7280"; // slate-500
  const gridColor = "rgba(0,0,0,0.05)";

  return (
    <div className="mt-4 mb-10 grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2 gap-6">

      {/* ================= PIE ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
        <h3 className="text-slate-800 text-lg mb-4 font-semibold">
          Estado general de la flota
        </h3>

        <Pie
          data={{
            labels: ["En Movimiento", "Detenidos"],
            datasets: [
              {
                data: [activos, detenidos],
                backgroundColor: ["#22c55e", "#ef4444"],
                borderWidth: 0,
              },
            ],
          }}
          options={{
            plugins: {
              legend: {
                labels: { color: "#334155", font: { size: 12 } },
              },
            },
          }}
        />
      </div>

      {/* ================= CRÍTICOS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
        <h3 className="text-rose-600 text-lg font-semibold mb-4">
          Alertas críticas
        </h3>

        <div className="h-[240px]">
          <Bar
            data={{
              labels: ["Críticas"],
              datasets: [
                {
                  data: [criticos],
                  backgroundColor: "#ef4444",
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { color: ticksColor },
                  grid: { display: false },
                },
                y: {
                  ticks: { color: ticksColor },
                  grid: { color: gridColor },
                  beginAtZero: true,
                  suggestedMax: Math.max(criticos + 3, 5),
                },
              },
            }}
          />
        </div>
      </div>

      {/* ================= PRIORITARIAS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
        <h3 className="text-amber-600 text-lg font-semibold mb-4">
          Alertas prioritarias
        </h3>

        <div className="h-[240px]">
          <Bar
            data={{
              labels: ["Prioritarias"],
              datasets: [
                {
                  data: [prioritarios],
                  backgroundColor: "#eab308",
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { color: ticksColor },
                  grid: { display: false },
                },
                y: {
                  ticks: { color: ticksColor },
                  grid: { color: gridColor },
                  beginAtZero: true,
                  suggestedMax: Math.max(prioritarios + 3, 5),
                },
              },
            }}
          />
        </div>
      </div>

      {/* ================= ACTIVOS / DETENIDOS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
        <h3 className="text-blue-600 text-lg font-semibold mb-4">
          Dispositivos en Movimiento
        </h3>

        <div className="h-[240px]">
          <Bar
            data={{
              labels: ["Activos", "Detenidos"],
              datasets: [
                {
                  data: [activos, detenidos],
                  backgroundColor: ["#22c55e", "#94a3b8"],
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { color: ticksColor },
                  grid: { display: false },
                },
                y: {
                  ticks: { color: ticksColor },
                  grid: { color: gridColor },
                  beginAtZero: true,
                  suggestedMax: Math.max(detenidos + 3, activos + 3, 5),
                },
              },
            }}
          />
        </div>
      </div>

    </div>
  );
}
