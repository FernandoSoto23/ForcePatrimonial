"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import SidebarIcons from "./components/SidebarIcons";
import SidePanel from "./components/SidePanel";
import MapaBase from "./components/MapaBase";
import HistorialPanel from "./components/HistorialPanel";

import { useUnits } from "../../context/UnitsContext";
import { useGeocercas } from "../../context/GeocercasContext";

import { FaTruck, FaMapMarkedAlt, FaMapMarkerAlt } from "react-icons/fa";
import { MdOutlineReplay10 } from "react-icons/md";

/* =========================
   MAPBOX STYLES
========================= */
const MAP_STYLES = {
  normal: "mapbox://styles/mapbox/navigation-day-v1",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/navigation-night-v1",
};

/* =========================
   HELPERS
========================= */
function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getUnitName(u) {
  return (
    u?.nm ||
    u?.name ||
    u?.alias ||
    u?.unidad ||
    u?.label ||
    u?.device_name ||
    `Unidad ${u?.id}`
  );
}

function getCoords(u) {
  const lat = Number(u?.lat ?? u?.latitude ?? u?.latitud ?? u?.y);
  const lon = Number(u?.lon ?? u?.lng ?? u?.longitude ?? u?.longitud ?? u?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lon, lat];
}

/* =========================
   COMPONENT
========================= */
export default function GlobalTrack() {
  const { units, refreshUnits } = useUnits();
  const { polys } = useGeocercas();

  const mapRef = useRef(null);
  const popupRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchGeo, setSearchGeo] = useState("");
  const [mapStyle, setMapStyle] = useState("normal");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUnitId, setHistoryUnitId] = useState(null);

  /* =========================
     AUTO REFRESH
  ========================= */
  useEffect(() => {
    const id = setInterval(() => {
      refreshUnits({ silent: true });
    }, 5000);
    return () => clearInterval(id);
  }, [refreshUnits]);

  /* =========================
     UNITS
  ========================= */
  const safeUnits = useMemo(() => {
    if (Array.isArray(units)) return units;
    if (Array.isArray(units?.data)) return units.data;
    if (Array.isArray(units?.items)) return units.items;
    return [];
  }, [units]);

  const filteredUnits = useMemo(() => {
    if (!search) return safeUnits;
    const q = normalize(search);
    return safeUnits.filter((u) =>
      normalize(getUnitName(u)).includes(q)
    );
  }, [safeUnits, search]);

  /* =========================
     GEOCERCAS
  ========================= */
  const filteredGeocercas = useMemo(() => {
    if (!Array.isArray(polys)) return [];
    const list = polys
      .map((g) => ({
        ...g,
        _name: g?.properties?.name || "Geocerca",
      }))
      .sort((a, b) => a._name.localeCompare(b._name));

    if (!searchGeo) return list;
    const q = normalize(searchGeo);
    return list.filter((g) =>
      normalize(g._name).includes(q)
    );
  }, [polys, searchGeo]);

  /* =========================
     ACTIONS
  ========================= */
  function focusUnit(u) {
    const map = mapRef.current;
    const coords = getCoords(u);
    if (!map || !coords) return;

    map.flyTo({ center: coords, zoom: 16 });
    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup()
      .setLngLat(coords)
      .setHTML(`<strong>${getUnitName(u)}</strong>`)
      .addTo(map);
  }

  function openHistory(u) {
    setHistoryUnitId(u.id);
    setHistoryOpen(true);
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="relative w-screen h-screen">

      <SidebarIcons
        active={activePanel}
        onSelect={(p) => {
          if (p === "history") {
            setHistoryOpen(true);
            return;
          }
          setActivePanel((prev) => (prev === p ? null : p));
        }}
      />

      {/* ================= UNIDADES ================= */}
      <SidePanel
        open={activePanel === "units"}
        title={`Unidades (${filteredUnits.length})`}
        onClose={() => setActivePanel(null)}
      >
        <div className="p-3 border-b">
          <input
            className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm"
            placeholder="Buscar activos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-160px)]">
          {filteredUnits.map((u) => {
            const speed = Number(u?.speed ?? 0);

            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 border-b hover:bg-gray-50"
              >
                <FaTruck className="text-gray-600 shrink-0" />

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {getUnitName(u)}
                  </div>
                </div>

                {/* VELOCIDAD (REGRESADA ✅) */}
                <span
                  className={[
                    "text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap",
                    speed > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {speed} km/h
                </span>

                {/* Ubicar */}
                <button
                  title="Ubicar"
                  onClick={() => focusUnit(u)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <FaMapMarkerAlt />
                </button>

                {/* Historial */}
                <button
                  title="Historial"
                  onClick={() => openHistory(u)}
                  className="text-gray-500 hover:text-purple-600"
                >
                  <MdOutlineReplay10 size={18} />
                </button>
              </div>
            );
          })}

        </div>
      </SidePanel>

      {/* ================= GEOCERCAS ================= */}
      <SidePanel
        open={activePanel === "geos"}
        title={`Geocercas (${filteredGeocercas.length})`}
        onClose={() => setActivePanel(null)}
      >
        <div className="p-3 border-b">
          <input
            className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm"
            placeholder="Buscar geocercas..."
            value={searchGeo}
            onChange={(e) => setSearchGeo(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-160px)]">
          {filteredGeocercas.map((g, i) => (
            <button
              key={i}
              className="flex w-full items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 text-left"
              onClick={() => {
                const c = g?.geometry?.coordinates?.[0]?.[0];
                mapRef.current?.easeTo({ center: c, zoom: 14 });
              }}
            >
              <FaMapMarkedAlt />
              <span className="truncate">{g._name}</span>
            </button>
          ))}
        </div>
      </SidePanel>

      {/* ================= MODO MAPA (🔧 RESTAURADO) ================= */}
      <SidePanel
        open={activePanel === "mapStyle"}
        title="Modo de mapa"
        onClose={() => setActivePanel(null)}
      >
        <div className="p-3 space-y-2">
          {["normal", "satellite", "dark"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMapStyle(m);
                setActivePanel(null);
              }}
              className={`w-full px-3 py-2 rounded-lg text-left ${mapStyle === m
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
                }`}
            >
              {m === "normal" && "🗺 Normal"}
              {m === "satellite" && "🛰 Satélite"}
              {m === "dark" && "🌙 Oscuro"}
            </button>
          ))}
        </div>
      </SidePanel>

      {/* ================= MAPA ================= */}
      <MapaBase
        mapRef={mapRef}
        popupRef={popupRef}
        mapStyle={MAP_STYLES[mapStyle]}
        units={safeUnits}
        geocercasGeoJSON={{
          type: "FeatureCollection",
          features: polys || [],
        }}
      />

      {/* ================= HISTORIAL ================= */}
      {historyOpen && (
        <HistorialPanel
          mapRef={mapRef}
          unitId={historyUnitId}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
