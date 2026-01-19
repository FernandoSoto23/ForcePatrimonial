import { useEffect, useMemo, useRef, useState } from "react";
import MapaBase from "../../components/MapaBase";
import { useUnits } from "../../context/UnitsContext";
import { useGeocercas } from "../../context/GeocercasContext"; // 👈 tu contexto

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function GlobalTrack() {
  const { units, refreshUnits } = useUnits();
  const { geocercasGeoJSON } = useGeocercas();

  const mapRef = useRef(null);
  const popupRef = useRef(null);

  const [mapMode, setMapMode] = useState("dark");
  const [searchUnits, setSearchUnits] = useState("");

  /* =========================
     AUTO REFRESH UNITS
  ========================= */
  useEffect(() => {
    const i = setInterval(() => {
      refreshUnits({ silent: true });
    }, 5000);

    return () => clearInterval(i);
  }, [refreshUnits]);

  const filteredUnits = useMemo(() => {
    const q = normalizeText(searchUnits);
    if (!q) return units;
    return units.filter((u) =>
      normalizeText(u.nm || "").includes(q)
    );
  }, [units, searchUnits]);

  return (
    <div className="fixed inset-0 top-[56px]">
      <MapaBase
        mapRef={mapRef}
        popupRef={popupRef}
        mapMode={mapMode}
        units={filteredUnits}
        geocercasGeoJSON={geocercasGeoJSON}
      />

      {/* PANEL UNITS */}
      <div className="fixed top-24 left-6 z-50 w-[300px] rounded-3xl bg-black/70 backdrop-blur-xl">
        <div className="p-4">
          <input
            className="w-full h-10 rounded-2xl bg-black/30 text-white px-3"
            placeholder="Buscar unidad…"
            value={searchUnits}
            onChange={(e) => setSearchUnits(e.target.value)}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredUnits.map((u) => (
            <div
              key={u.id}
              className="mb-2 rounded-2xl px-3 py-2 bg-white/5 text-white text-sm"
            >
              {u.nm || `Unidad ${u.id}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
