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
  GEO DETECTION HELPERS (OPTIMIZADO)
========================= */

// ✅ Calcular bounding box de una geocerca
function getBoundingBox(geocerca) {
  const g = geocerca?.geometry;
  if (!g) return null;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const processCoords = (coords) => {
    coords.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
  };

  if (g.type === "Polygon") {
    const ring = g.coordinates?.[0];
    if (ring) processCoords(ring);
  } else if (g.type === "MultiPolygon") {
    g.coordinates?.forEach(poly => {
      const ring = poly?.[0];
      if (ring) processCoords(ring);
    });
  }

  return { minX, maxX, minY, maxY };
}

// ✅ Check rápido con bounding box antes de point-in-polygon
function isPointInBoundingBox(point, bbox) {
  if (!bbox) return false;
  const [x, y] = point;
  return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
}

function pointInPolygon(point, polygon) {
  let x = point[0], y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function isUnitInGeocerca(unit, geocerca, bbox = null) {
  const coords = getCoords(unit);
  if (!coords) return false;

  // ✅ OPTIMIZACIÓN 1: Bounding box check primero (muy rápido)
  if (bbox && !isPointInBoundingBox(coords, bbox)) {
    return false;
  }

  const g = geocerca?.geometry;
  if (!g) return false;

  if (g.type === "Polygon") {
    const ring = g.coordinates?.[0];
    if (Array.isArray(ring) && ring.length > 3) {
      if (pointInPolygon(coords, ring)) return true;
      const swapped = ring.map(([a, b]) => [b, a]);
      if (pointInPolygon(coords, swapped)) return true;
    }
  }

  if (g.type === "MultiPolygon") {
    const polys = g.coordinates || [];
    for (const p of polys) {
      const ring = p?.[0];
      if (Array.isArray(ring) && ring.length > 3) {
        if (pointInPolygon(coords, ring)) return true;
        const swapped = ring.map(([a, b]) => [b, a]);
        if (pointInPolygon(coords, swapped)) return true;
      }
    }
  }

  return false;
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

  // ✅ PAGINACIÓN PARA UNIDADES
  const [unitsPage, setUnitsPage] = useState(0);
  const UNITS_PER_PAGE = 50;

  // ✅ PAGINACIÓN PARA GEOCERCAS
  const [geocercasPage, setGeocercasPage] = useState(0);
  const GEOCERCAS_PER_PAGE = 30;

  // ✅ CACHE DE BOUNDING BOXES
  const geocercasBoundingBoxes = useMemo(() => {
    if (!Array.isArray(polys)) return new Map();

    const map = new Map();
    polys.forEach((geocerca, idx) => {
      const bbox = getBoundingBox(geocerca);
      if (bbox) {
        map.set(idx, bbox);
      }
    });
    return map;
  }, [polys]);

  // ✅ GEOCERCA SELECCIONADA (HIGHLIGHT)
  const [selectedGeofenceId, setSelectedGeofenceId] = useState(null);


  /* =========================
    AUTO REFRESH
  ========================= */
  useEffect(() => {
    const id = setInterval(() => {
      refreshUnits({ silent: true });
    }, 10000); // ✅ Cambiado de 5000 a 10000ms (10 segundos)
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

  // ✅ UNIDADES PAGINADAS
  const paginatedUnits = useMemo(() => {
    const startIdx = unitsPage * UNITS_PER_PAGE;
    const endIdx = startIdx + UNITS_PER_PAGE;
    return filteredUnits.slice(startIdx, endIdx);
  }, [filteredUnits, unitsPage]);

  const totalUnitsPages = Math.ceil(filteredUnits.length / UNITS_PER_PAGE);

  /* =========================
    ✅ CALCULAR GEOCERCA DE CADA UNIDAD (SUPER OPTIMIZADO)
  ========================= */
  const unitsWithGeocerca = useMemo(() => {
    if (!Array.isArray(polys) || !safeUnits.length) return safeUnits;

    // ✅ Solo calcular cuando el panel de unidades está abierto
    if (activePanel !== 'units') return safeUnits;

    // ✅ Crear un Map para búsqueda rápida
    const unitGeocercaMap = new Map();

    // ✅ OPTIMIZACIÓN: Solo procesar unidades visibles en la página actual
    const startIdx = unitsPage * UNITS_PER_PAGE;
    const endIdx = startIdx + UNITS_PER_PAGE;
    const visibleUnits = safeUnits.slice(startIdx, endIdx);

    // Para cada unidad visible, buscar su geocerca
    visibleUnits.forEach(unit => {
      const geocercaIdx = polys.findIndex((g, gIdx) => {
        const bbox = geocercasBoundingBoxes.get(gIdx);
        return isUnitInGeocerca(unit, g, bbox);
      });

      const geocerca = geocercaIdx >= 0 ? polys[geocercaIdx] : null;

      if (geocerca) {
        unitGeocercaMap.set(unit.id, {
          name: geocerca?.properties?.name || null,
          id: geocerca?.id || null,
        });
      }
    });

    // Mapear todas las unidades
    return safeUnits.map(unit => {
      const geoInfo = unitGeocercaMap.get(unit.id);
      return {
        ...unit,
        _geocercaName: geoInfo?.name || null,
        _geocercaId: geoInfo?.id || null,
      };
    });
  }, [safeUnits, polys, activePanel, unitsPage, geocercasBoundingBoxes]);

  /* =========================
    ✅ CONTAR UNIDADES POR GEOCERCA (SUPER OPTIMIZADO)
  ========================= */
  const geocercasWithCount = useMemo(() => {
    if (!Array.isArray(polys)) return [];

    // ✅ Solo calcular cuando el panel de geocercas está abierto
    if (activePanel !== 'geos') {
      return polys.map(g => ({
        ...g,
        _unitsCount: 0,
        _unitsInside: [],
      }));
    }

    // ✅ CALCULAR PARA TODAS LAS GEOCERCAS (no solo página actual)
    return polys.map((geocerca, gIdx) => {
      const bbox = geocercasBoundingBoxes.get(gIdx);
      const unitsInside = safeUnits.filter(unit => isUnitInGeocerca(unit, geocerca, bbox));

      return {
        ...geocerca,
        _unitsCount: unitsInside.length,
        _unitsInside: unitsInside.slice(0, 5), // Solo guardar primeras 5
      };
    });
  }, [polys, safeUnits, activePanel, geocercasBoundingBoxes]);

  /* =========================
    GEOCERCAS
  ========================= */
  const filteredGeocercas = useMemo(() => {
    const list = geocercasWithCount
      .map((g) => ({
        ...g,
        _name: g?.properties?.name || "Geocerca",
      }))
      .sort((a, b) => a._name.localeCompare(b._name));

    if (!searchGeo) return list;
    const q = normalize(searchGeo);
    return list.filter((g) => normalize(g._name).includes(q));
  }, [geocercasWithCount, searchGeo]);

  // ✅ GEOCERCAS PAGINADAS
  const paginatedGeocercas = useMemo(() => {
    const startIdx = geocercasPage * GEOCERCAS_PER_PAGE;
    const endIdx = startIdx + GEOCERCAS_PER_PAGE;
    return filteredGeocercas.slice(startIdx, endIdx);
  }, [filteredGeocercas, geocercasPage]);

  const totalGeocercasPages = Math.ceil(filteredGeocercas.length / GEOCERCAS_PER_PAGE);

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
            onChange={(e) => {
              setSearch(e.target.value);
              setUnitsPage(0); // Reset a primera página al buscar
            }}
          />
        </div>

        {/* ✅ PAGINACIÓN */}
        {totalUnitsPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <button
              onClick={() => setUnitsPage(p => Math.max(0, p - 1))}
              disabled={unitsPage === 0}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-600">
              Página {unitsPage + 1} de {totalUnitsPages}
            </span>
            <button
              onClick={() => setUnitsPage(p => Math.min(totalUnitsPages - 1, p + 1))}
              disabled={unitsPage >= totalUnitsPages - 1}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}

        <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
          {paginatedUnits.map((u) => {
            const speed = Number(u?.speed ?? 0);
            const isFollowing = followUnitId === String(u.id);

            // ✅ Buscar geocerca de la unidad
            const unitWithGeo = unitsWithGeocerca.find(ug => ug.id === u.id);
            const geocercaName = unitWithGeo?._geocercaName;

            return (
              <div
                key={u.id}
                className="flex flex-col gap-1 px-3 py-2 border-b hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
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

                {/* ✅ MOSTRAR GEOCERCA SI ESTÁ DENTRO */}
                {geocercaName && (
                  <div className="ml-8 text-xs text-blue-600 flex items-center gap-1">
                    <FaMapMarkedAlt size={12} />
                    <span>En: {geocercaName}</span>
                  </div>
                )}
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
            onChange={(e) => {
              setSearchGeo(e.target.value);
              setGeocercasPage(0); // Reset a primera página al buscar
            }}
          />
        </div>

        {/* ✅ PAGINACIÓN */}
        {totalGeocercasPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <button
              onClick={() => setGeocercasPage(p => Math.max(0, p - 1))}
              disabled={geocercasPage === 0}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-600">
              Página {geocercasPage + 1} de {totalGeocercasPages}
            </span>
            <button
              onClick={() => setGeocercasPage(p => Math.min(totalGeocercasPages - 1, p + 1))}
              disabled={geocercasPage >= totalGeocercasPages - 1}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}

        <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
          {paginatedGeocercas.map((g, i) => (
            <button
              key={i}
              className="flex flex-col w-full gap-2 px-4 py-3 border-b hover:bg-gray-50 text-left"
              onClick={() => {
                const map = mapRef?.current;
                if (!map) return;

                const center = getGeoCenterSafe(g);
                if (!center) return;

                // ✅ SETEAR GEOCERCA SELECCIONADA
                setSelectedGeofenceId(g?.id ?? g?.properties?.id ?? g._name);

                map.easeTo({ center, zoom: 14 });
              }}

            >
              <div className="flex items-center gap-3">
                <FaMapMarkedAlt />
                <span className="flex-1 truncate font-semibold">{g._name}</span>

                {/* ✅ CONTADOR DE UNIDADES */}
                <span
                  className={[
                    "text-xs px-2 py-1 rounded-full whitespace-nowrap font-semibold",
                    g._unitsCount > 0
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {g._unitsCount} {g._unitsCount === 1 ? 'unidad' : 'unidades'}
                </span>
              </div>

              {/* ✅ MOSTRAR LISTA DE UNIDADES DENTRO */}
              {g._unitsCount > 0 && g._unitsInside && g._unitsInside.length > 0 && (
                <div className="ml-7 text-xs text-gray-600 space-y-1">
                  {g._unitsInside.slice(0, 3).map((unit) => (
                    <div key={unit.id} className="flex items-center gap-2">
                      <FaTruck size={10} className="text-gray-400" />
                      <span className="truncate">{getUnitName(unit)}</span>
                    </div>
                  ))}
                  {g._unitsCount > 3 && (
                    <div className="text-gray-400 italic">
                      +{g._unitsCount - 3} más...
                    </div>
                  )}
                </div>
              )}
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
        showInfoPopup={followShowPopup}
        historyData={routeHistoryData}
        showHistoryRoute={showHistoryRoute}
        selectedStopIndex={selectedStopIndex}

        /* 🔥 ESTO ES LO QUE ACTIVA EL COLOR */
        selectedGeofenceId={selectedGeofenceId}
      />

    </div>
  );
}
