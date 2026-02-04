import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, XCircle, PhoneCall } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ModalLlamadaCabina from "../components/ModalLLamada";

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
  const [unidadLlamada, setUnidadLlamada] = useState(null);

  const mapRef = useRef(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("https://apipx.onrender.com/unidad/unidades", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUnits(Array.isArray(data) ? data : data.unidades ?? []);
      } catch (e) {
        console.error(e);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
    const i = setInterval(fetchUnits, 10000);
    return () => clearInterval(i);
  }, []);

  /* ================= FILTRO ================= */
  const filteredUnits = useMemo(() => {
    const q = search.toLowerCase();
    return units
      .filter(
        (u) =>
          u.unidad?.toLowerCase().includes(q) ||
          String(u.id).includes(q)
      )
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  }, [units, search]);

  /* ================= MAPA ================= */
  useEffect(() => {
    if (!selectedUnit?.lat || !selectedUnit?.lng) return;

    mapRef.current?.remove();

    const map = new mapboxgl.Map({
      container: "unitMap",
      style: "mapbox://styles/mapbox/light-v11",
      center: [selectedUnit.lng, selectedUnit.lat],
      zoom: 12,
    });

    new mapboxgl.Marker()
      .setLngLat([selectedUnit.lng, selectedUnit.lat])
      .addTo(map);

    mapRef.current = map;
    return () => map.remove();
  }, [selectedUnit]);

  if (loading) {
    return <div className="h-[70vh] flex items-center justify-center">Cargando…</div>;
  }

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Dispositivos</h1>
        <div className="flex items-center gap-2 border px-3 py-2 rounded">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar unidad…"
            className="outline-none text-sm"
          />
        </div>
      </div>

      {/* TABLA */}
      <table className="w-full bg-white rounded-xl overflow-hidden">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">Unidad</th>
            <th className="p-3">Velocidad</th>
            <th className="p-3">Último</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUnits.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 font-medium">{u.unidad}</td>
              <td className="p-3 text-center">{u.speed ?? 0} km/h</td>
              <td className="p-3 text-center">{timeAgo(u.ts)}</td>
              <td className="p-3 text-center flex justify-center gap-3">
                {u.lat && u.lng && (
                  <button onClick={() => setSelectedUnit(u)}>
                    <MapPin size={18} />
                  </button>
                )}
                <button
                  onClick={() => setUnidadLlamada(u.unidad)}
                  className="text-green-600"
                >
                  <PhoneCall size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL MAPA */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-[720px] h-[520px] p-4 rounded-xl relative">
            <button
              onClick={() => setSelectedUnit(null)}
              className="absolute top-3 right-3 text-red-500"
            >
              <XCircle size={24} />
            </button>
            <h2 className="mb-2 font-semibold">{selectedUnit.unidad}</h2>
            <div id="unitMap" className="w-full h-[440px]" />
          </div>
        </div>
      )}

      {/* MODAL LLAMADA */}
      {unidadLlamada && (
        <ModalLlamadaCabina
          unidad={unidadLlamada}
          onColgar={() => setUnidadLlamada(null)}
        />
      )}

    </div>
  );
}
