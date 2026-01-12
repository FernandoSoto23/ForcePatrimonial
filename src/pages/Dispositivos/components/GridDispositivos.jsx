import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, XCircle } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

function timeAgo(timestamp) {
  if (!timestamp) return "Sin datos";
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function GridDispositivos() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const mapRef = useRef(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("Sin auth_token");

        const res = await fetch(
          "https://apipx.onrender.com/unidad/unidades",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (Array.isArray(data)) {
          setUnits(data);
        } else if (Array.isArray(data.unidades)) {
          setUnits(data.unidades);
        } else {
          setUnits([]);
        }
      } catch (err) {
        console.error("Error cargando unidades:", err);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
    const i = setInterval(fetchUnits, 10000);
    return () => clearInterval(i);
  }, []);

  /* ================= FILTRO + PRIORIDAD ================= */
  const filteredUnits = useMemo(() => {
    const q = search.toLowerCase();

    const filtered = units.filter(
      (u) =>
        u.unidad?.toLowerCase().includes(q) ||
        String(u.id).includes(q)
    );

    // 🔥 prioridad: movimiento primero, luego detenidas, más reciente arriba
    return filtered.sort((a, b) => {
      const aMoving = (a.speed ?? 0) > 0;
      const bMoving = (b.speed ?? 0) > 0;

      if (aMoving && !bMoving) return -1;
      if (!aMoving && bMoving) return 1;

      return (b.ts ?? 0) - (a.ts ?? 0);
    });
  }, [units, search]);

  /* ================= MAPA MODAL ================= */
  useEffect(() => {
    if (!selectedUnit?.lat || !selectedUnit?.lng) return;

    const container = document.getElementById("unitMap");
    if (!container) return;

    mapRef.current?.remove();

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/light-v11",
      center: [selectedUnit.lng, selectedUnit.lat],
      zoom: 12,
    });

    map.on("load", () => {
      new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([selectedUnit.lng, selectedUnit.lat])
        .addTo(map);
    });

    mapRef.current = map;

    return () => map.remove();
  }, [selectedUnit]);

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center text-slate-500">
        Cargando unidades…
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Dispositivos
        </h1>

        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar unidad…"
            className="outline-none text-sm"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3">Velocidad</th>
              <th className="px-4 py-3">Último reporte</th>
              <th className="px-4 py-3">Mapa</th>
            </tr>
          </thead>

          <tbody>
            {filteredUnits.map((u) => {
              const detenida = (u.speed ?? 0) <= 0;

              return (
                <tr
                  key={u.id}
                  className={`border-t transition
                    ${
                      detenida
                        ? "bg-gray-50 text-gray-500"
                        : "hover:bg-slate-50"
                    }`}
                >
                  <td
                    className={`px-4 py-3 font-medium ${
                      detenida ? "text-gray-500" : "text-slate-900"
                    }`}
                  >
                    {u.unidad}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {detenida ? (
                      <span className="text-gray-400 font-semibold">
                        0 km/h
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">
                        {u.speed} km/h
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {timeAgo(u.ts)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {u.lat && u.lng && (
                      <button
                        onClick={() => setSelectedUnit(u)}
                        className={`${
                          detenida
                            ? "text-gray-400 hover:text-gray-500"
                            : "text-blue-600 hover:text-blue-800"
                        }`}
                      >
                        <MapPin size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredUnits.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-6 text-slate-400"
                >
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL MAPA */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[720px] h-[520px] rounded-xl relative p-4">
            <button
              onClick={() => setSelectedUnit(null)}
              className="absolute top-3 right-3 text-rose-500"
            >
              <XCircle size={24} />
            </button>

            <h2 className="font-semibold mb-2">
              {selectedUnit.unidad}
            </h2>

            <div
              id="unitMap"
              className="w-full h-[440px] rounded-lg border"
            />
          </div>
        </div>
      )}
    </div>
  );
}
