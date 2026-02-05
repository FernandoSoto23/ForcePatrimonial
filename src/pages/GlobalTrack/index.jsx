import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import SidebarIcons from "./components/SidebarIcons";
import SidePanel from "./components/SidePanel";
import MapaBase from "./components/MapaBase";
import HistorialPanel from "./components/HistorialPanel";

import { useUnits } from "../../context/UnitsContext";
import { useGeocercas } from "../../context/GeocercasContext";
import { useGeocercasLineales } from "../../context/GeocercasLinealesContext";

import { FaTruck, FaMapMarkedAlt, FaMapMarkerAlt } from "react-icons/fa";
import { MdOutlineReplay10 } from "react-icons/md";
import { MdGpsFixed } from "react-icons/md";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

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

function getGeoCenterSafe(feature) {
  try {
    const g = feature?.geometry;
    if (!g || !g.coordinates) return null;

    if (g.type === "Polygon") {
      const c = g.coordinates?.[0]?.[0];
      return Array.isArray(c) && c.length >= 2 ? c : null;
    }

    if (g.type === "MultiPolygon") {
      const c = g.coordinates?.[0]?.[0]?.[0];
      return Array.isArray(c) && c.length >= 2 ? c : null;
    }

    return null;
  } catch {
    return null;
  }
}

/* =========================
  COMPONENT
========================= */
export default function GlobalTrack() {
  const { units, refreshUnits } = useUnits();
  const { polys } = useGeocercas();
  const { lines } = useGeocercasLineales();

  const mapRef = useRef(null);
  const popupRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [search, setSearch] = useState("");
  const [searchGeo, setSearchGeo] = useState("");
  const [mapStyle, setMapStyle] = useState("normal");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUnitId, setHistoryUnitId] = useState(null);

  // ✅ seguir unidad
  const [followUnitId, setFollowUnitId] = useState(null);

  // ✅ SOLO ETIQUETA DEL SEGUIMIENTO
  const [followShowPopup, setFollowShowPopup] = useState(true);

  // ✅ ESTADO PARA HISTORIAL DE RUTAS
  const [routeHistoryData, setRouteHistoryData] = useState([]);
  const [routeHistoryLoading, setRouteHistoryLoading] = useState(false);
  const [routeHistoryError, setRouteHistoryError] = useState(null);

  // ✅ MOSTRAR/OCULTAR RUTA HISTORIAL
  const [showHistoryRoute, setShowHistoryRoute] = useState(false);

  // ✅ NUEVO: PARADA SELECCIONADA
  const [selectedStopIndex, setSelectedStopIndex] = useState(null);

  
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
    return safeUnits.filter((u) => normalize(getUnitName(u)).includes(q));
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
    return list.filter((g) => normalize(g._name).includes(q));
  }, [polys, searchGeo]);

  /* =========================
    🔥 BORRAR HISTORIAL DEL MAPA (FORZADO)
  ========================= */
  function forceClearHistoryFromMap() {
    const map = mapRef.current;
    if (!map) return;

    // Stops
    if (map.getLayer("history-stops-layer")) map.removeLayer("history-stops-layer");
    if (map.getSource("history-stops")) map.removeSource("history-stops");

    // Route
    if (map.getLayer("history-route-layer")) map.removeLayer("history-route-layer");
    if (map.getLayer("history-route-outline")) map.removeLayer("history-route-outline");
    if (map.getSource("history-route")) map.removeSource("history-route");
  }

  function handleClearHistory() {
    // 1) apaga dibujo
    setShowHistoryRoute(false);

    // 2) limpia data (esto hace que MapaBase también ejecute su limpieza interna)
    setRouteHistoryData([]);
    setRouteHistoryError(null);

    // 3) limpiar selección de parada
    setSelectedStopIndex(null);

    // 4) borra inmediatamente del mapa (sin esperar a useEffect)
    forceClearHistoryFromMap();
  }

  /* =========================
    FETCH ROUTE HISTORY
  ========================= */
  async function fetchRouteHistory({ unitId, from, to }) {
    setRouteHistoryLoading(true);
    setRouteHistoryError(null);
    setRouteHistoryData([]);
    setShowHistoryRoute(false);
    setSelectedStopIndex(null); // ✅ limpiar selección
    forceClearHistoryFromMap();

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setRouteHistoryError("No hay sesión activa.");
        return;
      }
      const API_URL = (
        import.meta.env.VITE_API_URL || "http://localhost:4000"
      ).replace(/\/$/, ""); // 🔒 quita slash final si existe

      const res = await fetch(
        `${API_URL}/historial-unidades`, // 👈 RUTA CORRECTA
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idents: [String(unitId)],
            from,
            to,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setRouteHistoryError(
          json?.error || json?.message || "No se pudo consultar el historial."
        );
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : [];
      setRouteHistoryData(data);
      setShowHistoryRoute(data.length > 0);
    } catch (err) {
      console.error("❌ fetchRouteHistory:", err);
      setRouteHistoryError("Error de red al consultar historial.");
    } finally {
      setRouteHistoryLoading(false);
    }
  }


  /* =========================
    ACTIONS
  ========================= */
  function focusUnit(u) {
    const map = mapRef?.current;
    const coords = getCoords(u);
    if (!map || !coords) return;

    map.flyTo({ center: coords, zoom: 16 });

    popupRef?.current?.remove?.();
    popupRef.current = new mapboxgl.Popup()
      .setLngLat(coords)
      .setHTML(`<strong>${getUnitName(u)}</strong>`)
      .addTo(map);
  }

  function openHistory(u) {
    setHistoryUnitId(u.id);
    setHistoryOpen(true);
  }

  function toggleFollow(u) {
    const id = String(u?.id);
    setFollowUnitId((prev) => (prev === id ? null : id));
  }

  /* =========================
    ✅ HANDLE STOP SELECTION
  ========================= */
  function handleStopSelect(stopIndex) {
    setSelectedStopIndex(stopIndex);
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
            const isFollowing = followUnitId === String(u.id);

            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 border-b hover:bg-gray-50"
              >
                <FaTruck className="text-gray-600 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {getUnitName(u)}
                  </div>
                </div>

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

                {isFollowing && (
                  <button
                    title={
                      followShowPopup
                        ? "Ocultar etiqueta (seguimiento)"
                        : "Mostrar etiqueta (seguimiento)"
                    }
                    onClick={() => setFollowShowPopup((prev) => !prev)}
                    className={[
                      "transition-colors",
                      followShowPopup
                        ? "text-gray-600 hover:text-blue-600"
                        : "text-red-500 hover:text-red-600",
                    ].join(" ")}
                  >
                    {followShowPopup ? (
                      <AiFillEye size={18} />
                    ) : (
                      <AiFillEyeInvisible size={18} />
                    )}
                  </button>
                )}

                <button
                  title={isFollowing ? "Dejar de seguir" : "Seguir unidad"}
                  onClick={() => toggleFollow(u)}
                  className={[
                    "transition-colors",
                    isFollowing ? "text-blue-700" : "text-gray-500 hover:text-blue-600",
                  ].join(" ")}
                >
                  <MdGpsFixed size={18} />
                </button>

                <button
                  title="Ubicar"
                  onClick={() => focusUnit(u)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <FaMapMarkerAlt />
                </button>

                <button
                  title="Ver historial"
                  onClick={() => openHistory(u)}
                  className="text-gray-500 hover:text-blue-600"
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
                const map = mapRef?.current;
                if (!map) return;

                const center = getGeoCenterSafe(g);
                if (!center) return;

                map.easeTo({ center, zoom: 14 });
              }}
            >
              <FaMapMarkedAlt />
              <span className="truncate">{g._name}</span>
            </button>
          ))}
        </div>
      </SidePanel>

      {/* ================= MODO MAPA ================= */}
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
              className={`w-full px-3 py-2 rounded-lg text-left ${mapStyle === m ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
            >
              {m === "normal" && "🗺 Normal"}
              {m === "satellite" && "🛰 Satélite"}
              {m === "dark" && "🌙 Oscuro"}
            </button>
          ))}
        </div>
      </SidePanel>

      {/* ================= HISTORIAL PANEL ================= */}
      {historyOpen && (
        <HistorialPanel
          isOpen={historyOpen}
          onClose={() => {
            setHistoryOpen(false);
            setHistoryUnitId(null);
            handleClearHistory(); // ✅ al cerrar también limpia el mapa
          }}
          units={safeUnits}
          selectedUnitId={historyUnitId}
          onSelectUnit={setHistoryUnitId}
          onFetchHistory={fetchRouteHistory}
          historyData={routeHistoryData}
          historyLoading={routeHistoryLoading}
          historyError={routeHistoryError}
          mapRef={mapRef}
          showHistoryRoute={showHistoryRoute}
          setShowHistoryRoute={setShowHistoryRoute}
          // ✅ ESTE ES EL IMPORTANTE (BOTÓN BORRAR HISTORIAL)
          onClearHistory={handleClearHistory}
          // ✅ NUEVO: PASAR HANDLER DE SELECCIÓN DE PARADA
          onStopSelect={handleStopSelect}
          selectedStopIndex={selectedStopIndex}
        />
      )}

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
        geocercasLinealesGeoJSON={{
          type: "FeatureCollection",
          features: lines || [],
        }}
        followUnitId={followUnitId}
        setFollowUnitId={setFollowUnitId}
        followShowPopup={followShowPopup}
        // 🔥 HISTORIAL
        historyData={routeHistoryData}
        showHistoryRoute={showHistoryRoute}
        // ✅ NUEVO: PASAR ÍNDICE DE PARADA SELECCIONADA
        selectedStopIndex={selectedStopIndex}
      />
    </div>
  );
}
