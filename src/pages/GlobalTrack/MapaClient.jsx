

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import AlertsClient from "@/components/AlertsClient";


export default function MapaClient() {
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState(""); // "" = ver todas
  const [focus, setFocus] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // carga/poll de unidades
  useEffect(() => {
    let t;

    const normalizeArray = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.units)) return raw.units;
      return [];
    };

    const load = async () => {
      try {
        const r = await fetch("/api/units", { cache: "no-store" });
        const raw = await r.json();
        setUnits(normalizeArray(raw));
      } catch (e) {
        console.error("units fetch error", e);
      }
    };

    load();
    t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  // Lista del combo
  const combo = useMemo(() => (Array.isArray(units) ? units : []), [units]);

  // Unidades a mostrar (todas o solo la seleccionada)
  const shownUnits = useMemo(() => {
    if (!Array.isArray(units)) return [];
    if (!selected) return units;
    return units.filter((u) => String(u.id ?? u.ident ?? "") === selected);
  }, [units, selected]);

  // Cuando seleccionas unidad y el mapa ya está listo, hace fly-to
  useEffect(() => {
    if (!mapReady) return;
    if (!selected) {
      setFocus(null);
      return;
    }
    const u = units.find(
      (x) => String(x.id ?? x.ident ?? "") === selected
    );
    const lat = Number(u?.lat ?? u?.position?.latitude ?? u?.pos?.y ?? NaN);
    const lon = Number(u?.lon ?? u?.position?.longitude ?? u?.pos?.x ?? NaN);
    if (Number.isFinite(lat) && Number.isFinite(lon)) setFocus({ lat, lon });
  }, [selected, mapReady, units]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Mapa</h1>

      {/* Selector */}
      <div className="mb-3 flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-black/60 border border-white/10 rounded-md px-3 py-2 text-sm"
        >
          <option value="">— Ver todas —</option>
          {(combo ?? []).map((u) => {
            const id = String(u.id ?? u.ident ?? "");
            // intenta mostrar nombre real de Wialon
            const label =
              u.name ?? u.unitName ?? (u.ident ? `unit-${u.ident}` : id);
            return (
              <option key={id} value={id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Mapa */}
      <div className="relative w-full">
        <MapView
          units={shownUnits}
          focus={focus}
          onMapReady={() => setMapReady(true)}
        />

        {/* Panel de alertas (placeholder) */}
        <div className="absolute top-3 right-3 z-10">
          <AlertsClient />
        </div>
      </div>
    </div>
  );
}
