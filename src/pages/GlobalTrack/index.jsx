

import React, { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import mapboxgl from "mapbox-gl";
import { useGeocercas } from "./../../context/GeocercasContext";
import { useUnits } from "./../../context/UnitsContext";
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";


/* =========================
   HELPERS
========================= */
function toDatetimeLocalValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function datetimeLocalToEpochSec(v) {
  const d = new Date(v);
  return Math.floor(d.getTime() / 1000);
}

function fmtStop(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDateTime(epochSec) {
  if (!epochSec) return "—";
  return new Date(epochSec * 1000).toLocaleString("es-MX");
}

function fmtAgo(epochSec) {
  if (!epochSec) return "—";
  const now = Math.floor(Date.now() / 1000);
  const d = Math.max(0, now - epochSec);
  if (d < 60) return `${d}s`;
  const m = Math.floor(d / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

function isValidPolygon(g) {
  try {
    if (!g?.geometry) return false;
    if (g.geometry.type === "Polygon")
      return Array.isArray(g.geometry.coordinates?.[0]) && g.geometry.coordinates[0].length >= 3;
    if (g.geometry.type === "MultiPolygon")
      return (
        Array.isArray(g.geometry.coordinates?.[0]?.[0]) && g.geometry.coordinates[0][0].length >= 3
      );
    return false;
  } catch {
    return false;
  }
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dynamicZoom(speed) {
  if (speed < 5) return 17;
  if (speed < 20) return 15;
  if (speed < 60) return 13;
  return 11;
}

/* =========================
   TELEMETRÍA + COPIAR + GOOGLE MAPS + DIRECCIÓN
========================= */
function pickAny(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    return ["1", "true", "on", "encendido", "yes", "si"].includes(s);
  }
  return undefined;
}

function getTelemetry(u) {
  const p = u?.prms || {};
  const sats = toNumber(pickAny(p, ["sat", "sats", "gps_sats", "gps_sat", "gsat", "gps_satelites"]));
  const hdop = toNumber(pickAny(p, ["hdop", "gps_hdop"]));
  const odometerKm = toNumber(pickAny(p, ["odometer", "odo", "mileage", "km", "odometer_km"]));
  const ignition = toBool(pickAny(p, ["ignition", "ign", "acc", "contact", "encendido"]));
  const voltage = toNumber(pickAny(p, ["voltage", "volt", "vbat", "battery_voltage", "vbatt"]));
  const gsm = toNumber(pickAny(p, ["gsm", "gsm_level", "signal", "csq", "rssi"]));
  const fuel = toNumber(pickAny(p, ["fuel", "combustible", "fuel_level", "gas"]));
  const temp = toNumber(pickAny(p, ["temp", "temperature", "temperatura"]));
  return { sats, hdop, odometerKm, ignition, voltage, gsm, fuel, temp };
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function openGoogleMaps(lat, lon) {
  const url = `https://www.google.com/maps?q=${lat},${lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openGoogleMapsDirections(
  originLat,
  originLon,
  destLat,
  destLon
) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================
   UI COMPONENTS
========================= */
function FabButton({
  icon,
  label,
  onClick,
  className,
  disabled,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative",
        "w-10 h-10 md:w-11 md:h-11",
        "rounded-full shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-150 ease-out",
        "hover:scale-[1.04] active:scale-[0.98]",
        "ring-1 ring-white/10 hover:ring-white/25",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
        className,
      ].join(" ")}
    >
      <span className="text-[16px] md:text-[18px]">{icon}</span>

      <span
        className={[
          "pointer-events-none absolute right-12",
          "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px]",
          "bg-black/80 text-white",
          "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-150",
          "ring-1 ring-white/10 shadow-xl",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  active,
  danger,
  small,
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        small ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-xl",
        "grid place-items-center",
        "transition active:scale-[0.98]",
        "ring-1 ring-white/10",
        danger
          ? "bg-red-500/15 hover:bg-red-500/25 text-red-200"
          : active
            ? "bg-yellow-400 text-black"
            : "bg-white/5 hover:bg-white/10 text-white",
      ].join(" ")}
    >
      <span className={small ? "text-[14px] leading-none" : "text-[15px] leading-none"}>
        {children}
      </span>
    </button>
  );
}

function StatusDot({ kind }) {
  const cls =
    kind === "stale" ? "bg-zinc-500" : kind === "stop" ? "bg-yellow-400" : "bg-green-400";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-30 ${cls}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cls}`} />
    </span>
  );
}

function ChipDark({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/6 ring-1 ring-white/10 px-2 py-0.5 text-[11px] text-white/80">
      {children}
    </span>
  );
}

function Toggle({
  value,
  onChange,
  title,
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      className={[
        "h-7 w-12 rounded-full relative transition ring-1 ring-white/10",
        value ? "bg-green-500/90" : "bg-white/10 hover:bg-white/15",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[3px] h-5 w-5 rounded-full bg-white transition",
          value ? "left-[25px]" : "left-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

/* =========================
   STOPS
========================= */
function computeStops(
  points,
  minStopSec,
  speedThreshold = 2,
  maxGapSec = 300
) {
  const stops = [];
  if (!points.length) return stops;

  let i = 0;
  while (i < points.length) {
    const p = points[i];
    const sp = Number(p.speed ?? 0);
    const t = Number(p.time ?? 0);

    if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat) || !t) {
      i++;
      continue;
    }

    if (sp > speedThreshold) {
      i++;
      continue;
    }

    let j = i;
    let sumLon = 0;
    let sumLat = 0;
    let cnt = 0;

    let tStart = Number(points[i].time ?? 0);
    let tEnd = tStart;
    let prevT = tStart;

    while (j < points.length) {
      const pj = points[j];
      const spj = Number(pj.speed ?? 0);
      const tj = Number(pj.time ?? 0);

      if (!tj || !Number.isFinite(pj.lon) || !Number.isFinite(pj.lat)) break;
      if (spj > speedThreshold) break;
      if (tj - prevT > maxGapSec) break;
      prevT = tj;

      tEnd = tj;
      sumLon += pj.lon;
      sumLat += pj.lat;
      cnt++;
      j++;
    }

    const dur = Math.max(0, tEnd - tStart);
    if (dur >= minStopSec && cnt > 0) {
      stops.push({
        lon: sumLon / cnt,
        lat: sumLat / cnt,
        from: tStart,
        to: tEnd,
        dur,
      });
    }

    i = Math.max(j, i + 1);
  }

  return stops;
}

/* =========================
   VIRTUAL LIST (NO react-window)
========================= */
const GEO_ROW_H = 64;
const GEO_OVERSCAN = 8;

const GeoRow = React.memo(function GeoRow({
  name,
  isSelected,
  isVisible,
  onGo,
  onToggle,
}) {
  return (
    <div
      onClick={onGo}
      className={[
        "flex items-center justify-between gap-2 cursor-pointer rounded-2xl px-2.5",
        "ring-1 ring-white/10",
        "transition",
        isSelected ? "bg-white/10 ring-white/20" : "bg-white/[0.04] hover:bg-white/[0.07]",
      ].join(" ")}
      style={{ height: GEO_ROW_H }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onGo();
        }}
        className="px-3 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-xs font-semibold transition"
      >
        Ir
      </button>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-white/90 truncate">{name}</div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={[
          "h-7 w-12 rounded-full relative transition ring-1 ring-white/10",
          isVisible ? "bg-green-500/90" : "bg-white/10 hover:bg-white/15",
        ].join(" ")}
        title={isVisible ? "Ocultar geocerca" : "Mostrar geocerca"}
      >
        <span
          className={[
            "absolute top-[3px] h-5 w-5 rounded-full bg-white transition",
            isVisible ? "left-[25px]" : "left-[3px]",
          ].join(" ")}
        />
      </button>
    </div>
  );
});

function VirtualList({
  items,
  height,
  rowHeight,
  renderRow,
}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const total = items.length;
  const totalH = total * rowHeight;

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - GEO_OVERSCAN);
  const end = Math.min(total - 1, Math.floor((scrollTop + height) / rowHeight) + GEO_OVERSCAN);

  const topPad = start * rowHeight;
  const bottomPad = Math.max(0, totalH - (end + 1) * rowHeight);

  return (
    <div
      className="overflow-y-auto pr-2 custom-scroll"
      style={{ height }}
      onScroll={(e) => setScrollTop((e.target).scrollTop)}
    >
      <div style={{ height: topPad }} />
      <div className="space-y-2">
        {Array.from({ length: Math.max(0, end - start + 1) }).map((_, i) => {
          const idx = start + i;
          if (!items[idx]) return null;
          return <div key={items[idx].key}>{renderRow(idx)}</div>;
        })}
      </div>
      <div style={{ height: bottomPad }} />
    </div>
  );
}

/* =========================
   MAIN
========================= */
export default function GlobalTack() {
  const { polys, ready: geosReady } = useGeocercas();

  // 🔹 unidades (ya cargadas globalmente)
  const { units } = useUnits();

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);


  const [visibleUnits, setVisibleUnits] = useState({});

  const [geos, setGeos] = useState([]);
  const [hiddenGeos, setHiddenGeos] = useState(() => new Set());

  const [highlight, setHighlight] = useState(null);

  const [searchUnits, setSearchUnits] = useState("");
  const [searchGeos, setSearchGeos] = useState("");

  const deferredSearchGeos = useDeferredValue(searchGeos);

  const [openUnits, setOpenUnits] = useState(true);
  const [openGeos, setOpenGeos] = useState(false);

  const [style, setStyle] = useState("mapbox://styles/mapbox/dark-v11");
  const [followId, setFollowId] = useState(null);

  const [routeData, setRouteData] = useState(null);

  const [autoCenter, setAutoCenter] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);

  const [uiOpen, setUiOpen] = useState(true);

  // UI
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const unitsSearchInputRef = useRef(null);

  // ✅ PANEL RAPIDO: abrir/cerrar
  const [quickPanelOpen, setQuickPanelOpen] = useState(true);

  // Dirección (reverse geocode)
  const [selectedAddress, setSelectedAddress] = useState("");

  // =======================
  // RUTA DE APOYO (monitorista)
  // =======================
  const [assistMode, setAssistMode] = useState(false);
  const [assistDest, setAssistDest] = useState(null);
  const [assistRouteData, setAssistRouteData] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistMsg, setAssistMsg] = useState(null);

  // refs para evitar closures viejas en el click handler del mapa
  const assistModeRef = useRef(false);
  const selectedUnitIdRef = useRef(null);
  const unitsRef = useRef([]);
  useEffect(() => {
    assistModeRef.current = assistMode;
  }, [assistMode]);
  useEffect(() => {
    selectedUnitIdRef.current = selectedUnitId;
  }, [selectedUnitId]);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // =======================
  // HISTORIAL
  // =======================
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState(
    "Selecciona una unidad para ver historial…"
  );

  const [historyUnitId, setHistoryUnitId] = useState(null);

  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toDatetimeLocalValue(d);
  });
  const [historyTo, setHistoryTo] = useState(() => toDatetimeLocalValue(new Date()));

  const [historyDetectTrips, setHistoryDetectTrips] = useState(true);
  const [historyMinStopSec, setHistoryMinStopSec] = useState(600);

  const [historyDataRaw, setHistoryDataRaw] = useState(null);

  const [historyRouteData, setHistoryRouteData] = useState(null);

  const [historyEndpointsFC, setHistoryEndpointsFC] = useState(null);

  const [historyAllPoints, setHistoryAllPoints] = useState([]);

  const [stopsFC, setStopsFC] = useState(null);
  const [stopsList, setStopsList] = useState([]);

  // Reproductor
  const [playerOpen, setPlayerOpen] = useState(true);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playerSpeed, setPlayerSpeed] = useState(2);
  const [playerFollowCam, setPlayerFollowCam] = useState(true);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [playerPoints, setPlayerPoints] = useState([]);
  const tickRef = useRef(null);
  const lastTickRef = useRef(0);

  const [historyPlayerPointFC, setHistoryPlayerPointFC] = useState(
    null
  );

  // Height virtual list geos
  const [geoListHeight, setGeoListHeight] = useState(420);
  useEffect(() => {
    const calc = () => {
      const h = Math.min(520, Math.floor(window.innerHeight * 0.55));
      setGeoListHeight(h);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const baseColors = [
    "#00E5FF",
    "#FFEA00",
    "#FF3D00",
    "#76FF03",
    "#2979FF",
    "#AA00FF",
    "#FF00AA",
    "#00FFAA",
  ];
  const colorCacheRef = useRef({});
  function colorFor(name) {
    if (!colorCacheRef.current[name]) {
      colorCacheRef.current[name] = baseColors[Math.floor(Math.random() * baseColors.length)];
    }
    return colorCacheRef.current[name];
  }

  // ✅ Se conservan por si quieres usarlos, pero YA NO BLOQUEAMOS el mapa con hover.
  // El bloqueo por hover es lo que te estaba “congelando” el mapa al cargar.
  function disableMapUI() {
    const map = mapRef.current;
    if (!map) return;
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.dragPan.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  }
  function enableMapUI() {
    const map = mapRef.current;
    if (!map) return;
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.dragRotate.enable();
    map.dragPan.enable();
    map.keyboard.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
  }

  useEffect(() => {
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  // Atajos
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setUiOpen(true);
        setOpenUnits(true);
        setTimeout(() => unitsSearchInputRef.current?.focus(), 0);
      }
      if (e.key.toLowerCase() === "u") {
        setUiOpen(true);
        setOpenUnits((v) => !v);
      }
      if (e.key.toLowerCase() === "f") {
        setFocusMode((v) => !v);
      }
      if (e.key === "Escape") {
        setFocusMode(false);
        setAssistMode(false);
        setAssistMsg(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ FAIL-SAFE GLOBAL: si por algo quedó deshabilitada la UI, la reactivamos al soltar click
  useEffect(() => {
    const onUp = () => enableMapUI();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // Map init / style switch
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapboxgl.accessToken) {
      console.error("Falta NEXT_PUBLIC_MAPBOX_TOKEN (Mapbox).");
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: [-102.5, 23.5],
      zoom: 5,
      attributionControl: false,
    });

    mapRef.current = map;
    setMapLoaded(false);

    const onStyleLoad = () => {
      setMapLoaded(true);

      // ✅ FAIL-SAFE: garantiza que el mapa SIEMPRE quede “movible” al terminar de cargar
      // (esto corrige el bug de que al cargar no dejaba moverte hasta recargar)
      enableMapUI();

      enableTooltips();
      drawGeos();
      drawUnits();
      drawRoute();
      drawAssistRoute(); // ✅ RUTA DE APOYO
      drawHistory();
      drawHistoryEndpoints();
      drawStops();
      drawHistoryPlayer();
      updateTrafficLayer();
    };

    // click para definir destino cuando assistMode está activo
    const onMapClickForAssist = (e) => {
      if (!assistModeRef.current) return;

      // si clickean una unidad/geocerca, NO tomamos ese click como destino
      const hits = map.queryRenderedFeatures(e.point, { layers: ["units-layer", "geofences-fill"] });
      if (hits?.length) return;

      const selId = selectedUnitIdRef.current;
      const u = selId != null ? unitsRef.current.find((x) => x.id === selId) : null;
      if (!u?.pos) {
        setAssistMsg("Selecciona una unidad con posición válida.");
        setAssistMode(false);
        return;
      }

      const dest = { lon: e.lngLat.lng, lat: e.lngLat.lat };
      setAssistDest(dest);
      setAssistMode(false);

      buildAssistRoute({ lon: u.pos.x, lat: u.pos.y }, dest);
    };

    map.on("style.load", onStyleLoad);
    map.on("click", onMapClickForAssist);

    return () => {
      map.off("style.load", onStyleLoad);
      map.off("click", onMapClickForAssist);
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);




  useEffect(() => {
    setVisibleUnits((prev) => {
      const next = { ...prev };

      units.forEach((u) => {
        if (next[u.id] === undefined) {
          next[u.id] = true;
        }
      });

      return next;
    });
  }, [units]);

  // ✅ Consumir geocercas desde Context
  useEffect(() => {
    if (!geosReady || !Array.isArray(polys)) return;

    const parsed = polys.map((g) => ({
      type: "Feature",
      geometry: g.geometry,
      properties: {
        name: String(g.properties?.name ?? "Sin nombre"),
        color: colorFor(String(g.properties?.name ?? "Sin nombre")),
      },
    }));

    setGeos(parsed);

    console.log("🟢 Geocercas cargadas desde Context:", parsed.length);
  }, [ready, polys]);

  async function loadRoute(unitId) {
    try {
      const res = await fetch(`/api/wialon/route?unitId=${unitId}`);
      const data = await res.json();

      const coords = Array.isArray(data)
        ? data
        : Array.isArray(data?.coords)
          ? data.coords
          : [];

      if (!coords.length) {
        setRouteData(null);
        return;
      }

      const lineFeature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      };

      const pointFeatures = coords.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c },
        properties: {},
      }));

      setRouteData({
        type: "FeatureCollection",
        features: [lineFeature, ...pointFeatures],
      });
    } catch {
      setRouteData(null);
    }
  }

  useEffect(() => {
    if (followId) loadRoute(followId);
    else setRouteData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followId, units]);

  function stopFollowOnly() {
    setFollowId(null);
    setRouteData(null);
  }

  // ✅ YA NO ABRIMOS HISTORIAL AL SELECCIONAR
  function selectUnit(id) {
    setSelectedUnitId(id);
    setHistoryUnitId(id);
    setHistoryMessage("Selecciona rango y consulta.");
    setQuickPanelOpen(true); // ✅ reabrir panel rápido al seleccionar
  }

  function enableTooltips() {
    if (tooltipRef.current) return;
    const t = document.createElement("div");
    t.className =
      "fixed px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none transition-opacity duration-150 opacity-0 z-[9999] whitespace-pre-line";
    tooltipRef.current = t;
    document.body.appendChild(t);
  }

  function showTooltip(x, y, text) {
    if (!tooltipRef.current || !text) return;
    const t = tooltipRef.current;
    t.style.left = x + 15 + "px";
    t.style.top = y + 15 + "px";
    t.textContent = text;
    t.style.opacity = "1";
  }

  function hideTooltip() {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = "0";
  }

  // =======================
  // RUTA DE APOYO (Directions)
  // =======================
  async function buildAssistRoute(
    origin,
    dest
  ) {
    if (!mapboxgl.accessToken) {
      setAssistMsg("Falta NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    setAssistLoading(true);
    setAssistMsg("Calculando ruta…");

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${origin.lon},${origin.lat};${dest.lon},${dest.lat}` +
        `?geometries=geojson&overview=full&steps=false&access_token=${mapboxgl.accessToken}`;

      const r = await fetch(url);
      const j = await r.json();

      const coords = j?.routes?.[0]?.geometry?.coordinates ?? [];
      if (!coords.length) {
        setAssistRouteData(null);
        setAssistMsg("No se pudo calcular la ruta.");
        return;
      }

      const line = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { kind: "assist-line" },
      };

      const originPt = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [origin.lon, origin.lat] },
        properties: { kind: "assist-origin" },
      };

      const destPt = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [dest.lon, dest.lat] },
        properties: { kind: "assist-dest" },
      };

      setAssistRouteData({
        type: "FeatureCollection",
        features: [line, originPt, destPt],
      });

      setAssistMsg(null);

      if (mapRef.current) {
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach((c) => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 80, duration: 900, maxZoom: 16 });
      }
    } catch {
      setAssistRouteData(null);
      setAssistMsg("Error al calcular la ruta.");
    } finally {
      setAssistLoading(false);
    }
  }

  function clearAssistRoute() {
    setAssistMode(false);
    setAssistDest(null);
    setAssistRouteData(null);
    setAssistMsg(null);
  }

  function drawAssistRoute() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!assistRouteData) {
      if (map.getLayer("assist-route-line")) map.removeLayer("assist-route-line");
      if (map.getLayer("assist-route-points")) map.removeLayer("assist-route-points");
      if (map.getSource("assist-route")) map.removeSource("assist-route");
      return;
    }

    if (!map.getSource("assist-route")) {
      map.addSource("assist-route", { type: "geojson", data: assistRouteData });

      map.addLayer({
        id: "assist-route-line",
        type: "line",
        source: "assist-route",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#FF7A00", "line-width": 4, "line-opacity": 0.95 },
      });

      map.addLayer({
        id: "assist-route-points",
        type: "circle",
        source: "assist-route",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "case",
            ["==", ["get", "kind"], "assist-origin"],
            "#34A853",
            "#EA4335",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.98,
        },
      });
    } else {
      (map.getSource("assist-route")).setData(assistRouteData);
    }
  }

  useEffect(() => {
    drawAssistRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, assistRouteData]);

  // =======================
  // UNITS LAYER
  // =======================
  function drawUnits() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const features = units
      .filter((u) => (visibleUnits[u.id] ?? true) && u.pos)
      .map((u) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [u.pos.x, u.pos.y],
        },
        properties: {
          name: u.nm,
          id: u.id,
          speed: u.pos?.s || 0,
          bearing: u.pos?.c ?? 0,
          color:
            (u.pos?.s || 0) > 40 ? "#00FF00" : (u.pos?.s || 0) > 10 ? "#FFD700" : "#FF3B3B",
        },
      }));

    const fc = { type: "FeatureCollection", features };

    if (!map.getSource("units")) {
      map.addSource("units", { type: "geojson", data: fc });

      map.addLayer({
        id: "units-layer",
        type: "circle",
        source: "units",
        paint: {
          "circle-radius": 6,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });

      map.addLayer({
        id: "units-direction",
        type: "symbol",
        source: "units",
        layout: {
          "icon-image": "triangle-11",
          "icon-size": 1.2,
          "icon-rotate": ["get", "bearing"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      map.on("click", "units-layer", (e) => {
        const feature = e?.features?.[0];
        if (!feature?.properties) return;
        const id = Number(feature.properties.id);
        if (!id) return;
        selectUnit(id);
      });

      map.on("mousemove", "units-layer", (e) => {
        const feature = e?.features?.[0];
        if (!feature?.properties) return;
        const p = feature.properties;
        showTooltip(e.point.x, e.point.y, `${p.name} • ${p.speed} km/h`);
      });

      map.on("mouseleave", "units-layer", () => hideTooltip());
    } else {
      (map.getSource("units")).setData(fc);
    }

    if (followId && autoCenter) {
      const u = units.find((x) => x.id === followId);
      if (u?.pos) {
        map.flyTo({
          center: [u.pos.x, u.pos.y],
          zoom: dynamicZoom(u.pos.s || 0),
          speed: 0.7,
        });
      }
    }
  }

  useEffect(() => {
    drawUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, units, visibleUnits, followId, autoCenter]);

  // =======================
  // GEOFENCES + HIGHLIGHT
  // =======================
  function zoomToGeo(g) {
    const map = mapRef.current;
    if (!map) return;

    const coords =
      g.geometry.type === "Polygon"
        ? (g.geometry.coordinates[0])
        : (g.geometry.coordinates[0][0]);

    if (!coords?.length) return;

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));

    map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
  }

  function drawHighlight() {
    const map = mapRef.current;
    if (!map) return;

    if (!highlight) {
      if (map.getLayer("highlight-line-color")) map.removeLayer("highlight-line-color");
      if (map.getLayer("highlight-line")) map.removeLayer("highlight-line");
      if (map.getLayer("highlight-fill")) map.removeLayer("highlight-fill");
      if (map.getSource("highlight")) map.removeSource("highlight");
      return;
    }

    const fc = {
      type: "FeatureCollection",
      features: [highlight],
    };

    if (!map.getSource("highlight")) {
      map.addSource("highlight", { type: "geojson", data: fc });

      map.addLayer({
        id: "highlight-fill",
        type: "fill",
        source: "highlight",
        paint: {
          "fill-color": highlight.properties.color,
          "fill-opacity": 0.55,
        },
      });

      map.addLayer({
        id: "highlight-line",
        type: "line",
        source: "highlight",
        paint: {
          "line-color": "#ffffff",
          "line-width": 5,
        },
      });

      map.addLayer({
        id: "highlight-line-color",
        type: "line",
        source: "highlight",
        paint: {
          "line-color": highlight.properties.color,
          "line-width": 3,
        },
      });
    } else {
      (map.getSource("highlight")).setData(fc);
    }
  }

  function drawGeos() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const filtered = geos.filter((g) => !hiddenGeos.has(g.properties.name));

    const fcPolygons = {
      type: "FeatureCollection",
      features: filtered,
    };

    if (!map.getSource("geofences")) {
      map.addSource("geofences", { type: "geojson", data: fcPolygons });

      map.addLayer({
        id: "geofences-fill",
        type: "fill",
        source: "geofences",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "geofences-line",
        type: "line",
        source: "geofences",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
        },
      });

      map.on("click", "geofences-fill", (e) => {
        const feature = e?.features?.[0];
        if (!feature?.properties || !feature.geometry) return;

        const feat = {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            name: feature.properties.name,
            color: feature.properties.color,
          },
        };

        setHighlight(feat);
        zoomToGeo(feat);
      });

      map.on("mousemove", "geofences-fill", (e) => {
        const feature = e?.features?.[0];
        if (!feature?.properties) return;
        showTooltip(e.point.x, e.point.y, feature.properties.name);
      });
      map.on("mouseleave", "geofences-fill", hideTooltip);
    } else {
      (map.getSource("geofences")).setData(fcPolygons);
    }

    drawHighlight();
  }

  useEffect(() => {
    drawGeos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, geos, hiddenGeos, highlight]);

  // =======================
  // ROUTE (la de seguimiento)
  // =======================
  function drawRoute() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!routeData) {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getLayer("route-points")) map.removeLayer("route-points");
      if (map.getSource("route")) map.removeSource("route");
      return;
    }

    if (!map.getSource("route")) {
      map.addSource("route", { type: "geojson", data: routeData });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#00BFFF", "line-width": 3, "line-opacity": 0.9 },
      });

      map.addLayer({
        id: "route-points",
        type: "circle",
        source: "route",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 3,
          "circle-color": "#00BFFF",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 0.5,
          "circle-opacity": 0.95,
        },
      });
    } else {
      (map.getSource("route")).setData(routeData);
    }
  }

  useEffect(() => {
    drawRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, routeData]);

  // =======================
  // HISTORIAL
  // =======================
  function fitToHistory(points) {
    const map = mapRef.current;
    if (!map || points.length < 2) return;

    const bounds = new mapboxgl.LngLatBounds();
    for (const p of points) {
      if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
      bounds.extend([p.lon, p.lat]);
    }
    map.fitBounds(bounds, { padding: 70, maxZoom: 16, duration: 900 });
  }

  function buildHistoryFC(raw) {
    if (!raw?.segments?.length) return null;

    const features = [];

    for (const s of raw.segments) {
      const pts = (s.points || []).filter(
        (p) => Number.isFinite(p.lon) && Number.isFinite(p.lat) && typeof p.time === "number"
      );

      if (pts.length >= 2) {
        const coords = pts.map((p) => [p.lon, p.lat]);
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: { kind: "history-line" },
        });
      }

      for (const p of pts) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          properties: { time: Number(p.time ?? 0), speed: Number(p.speed ?? 0) },
        });
      }
    }

    return { type: "FeatureCollection", features };
  }

  function buildEndpoints(points) {
    const valid = points.filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    if (valid.length < 2) return null;

    const first = valid[0];
    const last = valid[valid.length - 1];

    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [first.lon, first.lat] },
          properties: { kind: "start" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [last.lon, last.lat] },
          properties: { kind: "end" },
        },
      ],
    };

    return fc;
  }

  function drawHistory() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!historyVisible || !historyRouteData) {
      if (map.getLayer("history-line-shadow")) map.removeLayer("history-line-shadow");
      if (map.getLayer("history-line-casing")) map.removeLayer("history-line-casing");
      if (map.getLayer("history-line-main")) map.removeLayer("history-line-main");
      if (map.getLayer("history-points")) map.removeLayer("history-points");
      if (map.getSource("history")) map.removeSource("history");
      return;
    }

    if (!map.getSource("history")) {
      map.addSource("history", { type: "geojson", data: historyRouteData });

      map.addLayer({
        id: "history-line-shadow",
        type: "line",
        source: "history",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#000000",
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.18,
            12,
            0.14,
            16,
            0.08,
            20,
            0.04,
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 14, 12, 16, 16, 14, 20, 12],
          "line-blur": ["interpolate", ["linear"], ["zoom"], 5, 3, 12, 3, 16, 2, 20, 1.2],
        },
      });

      map.addLayer({
        id: "history-line-casing",
        type: "line",
        source: "history",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#AECBFA",
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.95,
            12,
            0.85,
            16,
            0.35,
            18,
            0.18,
            20,
            0.1,
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 11, 12, 12, 16, 10, 20, 9],
        },
      });

      map.addLayer({
        id: "history-line-main",
        type: "line",
        source: "history",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1A73E8",
          "line-opacity": 1,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 7, 12, 8, 16, 9, 18, 10, 20, 11],
        },
      });

      map.addLayer({
        id: "history-points",
        type: "circle",
        source: "history",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 2.5,
          "circle-color": "#1A73E8",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.0,
            15,
            0.15,
            16,
            0.25,
            17,
            0.18,
            18,
            0.0,
          ],
        },
      });

      map.on("mousemove", "history-points", (e) => {
        const f = e?.features?.[0];
        if (!f?.properties) return;
        const sp = Number(f.properties.speed ?? 0);
        const t = Number(f.properties.time ?? 0);
        showTooltip(e.point.x, e.point.y, `${sp.toFixed(0)} km/h • ${fmtDateTime(t)}`);
      });
      map.on("mouseleave", "history-points", () => hideTooltip());
    } else {
      (map.getSource("history")).setData(historyRouteData);
    }
  }

  useEffect(() => {
    drawHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, historyRouteData, historyVisible]);

  function drawHistoryEndpoints() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!historyVisible || !historyEndpointsFC) {
      if (map.getLayer("history-endpoints")) map.removeLayer("history-endpoints");
      if (map.getSource("history-endpoints")) map.removeSource("history-endpoints");
      return;
    }

    if (!map.getSource("history-endpoints")) {
      map.addSource("history-endpoints", {
        type: "geojson",
        data: historyEndpointsFC,
      });

      map.addLayer({
        id: "history-endpoints",
        type: "circle",
        source: "history-endpoints",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 12, 7, 16, 9],
          "circle-color": ["case", ["==", ["get", "kind"], "start"], "#34A853", "#EA4335"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.98,
        },
      });
    } else {
      (map.getSource("history-endpoints")).setData(historyEndpointsFC);
    }
  }

  useEffect(() => {
    drawHistoryEndpoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, historyEndpointsFC, historyVisible]);

  function drawStops() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!historyVisible || !stopsFC) {
      if (map.getLayer("history-stops-label")) map.removeLayer("history-stops-label");
      if (map.getLayer("history-stops")) map.removeLayer("history-stops");
      if (map.getSource("history-stops")) map.removeSource("history-stops");
      return;
    }

    if (!map.getSource("history-stops")) {
      map.addSource("history-stops", { type: "geojson", data: stopsFC });

      map.addLayer({
        id: "history-stops",
        type: "circle",
        source: "history-stops",
        paint: {
          "circle-radius": 7,
          "circle-color": "#FFD700",
          "circle-stroke-color": "#111111",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "history-stops-label",
        type: "symbol",
        source: "history-stops",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.2,
        },
      });

      map.on("mousemove", "history-stops", (e) => {
        const f = e?.features?.[0];
        if (!f?.properties) return;
        const label = String(f.properties.label || "Parada");
        const from = Number(f.properties.from ?? 0);
        const to = Number(f.properties.to ?? 0);
        showTooltip(e.point.x, e.point.y, `${label}\n${fmtDateTime(from)} → ${fmtDateTime(to)}`);
      });
      map.on("mouseleave", "history-stops", () => hideTooltip());
    } else {
      (map.getSource("history-stops")).setData(stopsFC);
    }
  }

  useEffect(() => {
    drawStops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, stopsFC, historyVisible]);

  function drawHistoryPlayer() {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (!historyPlayerPointFC) {
      if (map.getLayer("history-player-point")) map.removeLayer("history-player-point");
      if (map.getSource("history-player")) map.removeSource("history-player");
      return;
    }

    if (!map.getSource("history-player")) {
      map.addSource("history-player", {
        type: "geojson",
        data: historyPlayerPointFC,
      });

      map.addLayer({
        id: "history-player-point",
        type: "circle",
        source: "history-player",
        paint: {
          "circle-radius": 8,
          "circle-color": "#00E5FF",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });
    } else {
      (map.getSource("history-player")).setData(historyPlayerPointFC);
    }
  }

  useEffect(() => {
    drawHistoryPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, historyPlayerPointFC]);

  function stopPlayer() {
    setPlayerPlaying(false);
    if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
    tickRef.current = null;
  }

  useEffect(() => {
    if (!playerPlaying) {
      stopPlayer();
      return;
    }
    if (!playerPoints.length) {
      setPlayerPlaying(false);
      return;
    }

    lastTickRef.current = performance.now();
    let acc = 0;

    const step = (now) => {
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      const pps = Math.max(0.5, playerSpeed);
      acc += (elapsed / 1000) * pps;

      if (acc >= 1) {
        const jumps = Math.floor(acc);
        acc -= jumps;

        setPlayerIdx((prev) => {
          const next = prev + jumps;
          const capped = Math.min(next, playerPoints.length - 1);

          const p = playerPoints[capped];
          if (p) {
            setHistoryPlayerPointFC({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: [p.lon, p.lat] },
                  properties: {},
                },
              ],
            });

            if (playerFollowCam && mapRef.current) {
              mapRef.current.easeTo({
                center: [p.lon, p.lat],
                zoom: 16,
                duration: 350,
              });
            }
          }

          if (capped >= playerPoints.length - 1) {
            setTimeout(() => stopPlayer(), 0);
          }

          return capped;
        });
      }

      tickRef.current = requestAnimationFrame(step);
    };

    tickRef.current = requestAnimationFrame(step);

    return () => {
      if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPlaying, playerSpeed, playerPoints, playerFollowCam]);

  function exportHistoryCSV(points, unitId) {
    if (!points.length) return;
    const header = ["unitId", "time_iso", "epoch", "lat", "lon", "speed_kmh"];
    const rows = points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.time)
      .map((p) => {
        const t = Number(p.time ?? 0);
        const iso = new Date(t * 1000).toISOString();
        return [
          String(unitId ?? ""),
          iso,
          String(t),
          String(p.lat),
          String(p.lon),
          String(Number(p.speed ?? 0)),
        ].join(",");
      });
    const csv = [header.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial_${unitId ?? "unidad"}_${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function consultarHistorial(unitId) {
    if (!unitId) {
      setHistoryMessage("Selecciona una unidad para consultar historial.");
      return;
    }
    if (!historyFrom || !historyTo) {
      setHistoryMessage("Selecciona fechas válidas.");
      return;
    }
    if (new Date(historyFrom) >= new Date(historyTo)) {
      setHistoryMessage("La fecha inicial debe ser menor que la final.");
      return;
    }

    setHistoryLoading(true);
    setHistoryMessage("Buscando información…");
    setHistoryDataRaw(null);
    setHistoryRouteData(null);
    setHistoryEndpointsFC(null);
    setHistoryAllPoints([]);
    setStopsFC(null);
    setStopsList([]);

    stopPlayer();
    setPlayerIdx(0);
    setPlayerPoints([]);
    setHistoryPlayerPointFC(null);

    try {
      const payload = {
        idents: [String(unitId)],
        from: datetimeLocalToEpochSec(historyFrom),
        to: datetimeLocalToEpochSec(historyTo),
        detectTrips: historyDetectTrips,
        minStopSec: historyMinStopSec,
      };

      const r = await fetch("/api/wialon/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();

      if (!j?.ok) {
        setHistoryMessage("No se pudo obtener información del servidor.");
        return;
      }

      const first = Array.isArray(j.data) ? j.data[0] : undefined;

      if (!first?.segments?.length) {
        setHistoryMessage("No se encontraron recorridos en este rango.");
        return;
      }

      setHistoryDataRaw(first);

      const flat = [];
      first.segments.forEach((s) => {
        (s.points || []).forEach((p) => {
          if (Number.isFinite(p.lon) && Number.isFinite(p.lat) && p.time) {
            flat.push(p);
          }
        });
      });

      setHistoryAllPoints(flat);
      setHistoryRouteData(buildHistoryFC(first));
      setHistoryEndpointsFC(buildEndpoints(flat));
      setHistoryVisible(true);
      setHistoryMessage(null);

      fitToHistory(flat);

      const stops = computeStops(flat, historyMinStopSec, 2, 300);
      setStopsList(stops);

      const fcStops = {
        type: "FeatureCollection",
        features: stops.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: {
            label: `Parada ${fmtStop(s.dur)}`,
            from: s.from,
            to: s.to,
            dur: s.dur,
          },
        })),
      };
      setStopsFC(fcStops);

      if (flat.length) {
        setPlayerPoints(flat);
        setPlayerIdx(0);
        const p0 = flat[0];
        setHistoryPlayerPointFC({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [p0.lon, p0.lat] },
              properties: {},
            },
          ],
        });
      }
    } catch {
      setHistoryMessage("Error al consultar historial.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function borrarHistorial() {
    setHistoryDataRaw(null);
    setHistoryRouteData(null);
    setHistoryEndpointsFC(null);
    setHistoryAllPoints([]);
    setStopsFC(null);
    setStopsList([]);
    setHistoryMessage("Selecciona una unidad para ver historial…");
    setHistoryVisible(false);

    stopPlayer();
    setPlayerIdx(0);
    setPlayerPoints([]);
    setHistoryPlayerPointFC(null);
  }

  function updateTrafficLayer() {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "traffic";
    const layerId = "traffic-line";

    if (!showTraffic) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const tryAddTraffic = () => {
      if (!map.isStyleLoaded()) {
        requestAnimationFrame(tryAddTraffic);
        return;
      }

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "vector",
          url: "mapbox://mapbox.mapbox-traffic-v1",
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          "source-layer": "traffic",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "congestion"], "heavy"],
              "#ff3b30",
              ["==", ["get", "congestion"], "moderate"],
              "#ffcc00",
              ["==", ["get", "congestion"], "low"],
              "#34c759",
              "#34c759",
            ],
            "line-width": 2,
          },
        });
      }
    };

    map.once("styledata", tryAddTraffic);
  }

  useEffect(() => {
    updateTrafficLayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, showTraffic, style]);

  const filteredUnits = useMemo(() => {
    const normalizedSearchUnits = normalizeText(searchUnits);
    return units.filter((u) => {
      if (!normalizedSearchUnits) return true;
      const name = normalizeText(u.nm);
      return name.includes(normalizedSearchUnits) || String(u.id).includes(normalizedSearchUnits);
    });
  }, [units, searchUnits]);

  const geoIndex = useMemo(() => {
    return geos.map((g) => ({
      g,
      name: g.properties.name,
      norm: normalizeText(g.properties.name),
    }));
  }, [geos]);

  const filteredGeoIndex = useMemo(() => {
    const q = normalizeText(deferredSearchGeos);
    if (!q) return geoIndex;
    return geoIndex.filter((x) => x.norm.includes(q) || normalizeText(String(x.name)).includes(q));
  }, [geoIndex, deferredSearchGeos]);

  function centerUnit(u) {
    if (!u.pos || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [u.pos.x, u.pos.y],
      zoom: 15,
      speed: 1.2,
    });
  }

  const allUnitsVisible = units.length > 0 && units.every((u) => (visibleUnits[u.id] ?? true));

  const totalGeos = geos.length;
  const visibleGeosCount = useMemo(() => totalGeos - hiddenGeos.size, [totalGeos, hiddenGeos]);
  const allGeosVisible = hiddenGeos.size === 0 && totalGeos > 0;

  function setAllUnitsVisibility(show) {
    if (!show && followId != null) stopFollowOnly();
    setVisibleUnits((prev) => {
      const v = { ...prev };
      units.forEach((u) => (v[u.id] = show));
      return v;
    });
  }

  function toggleUI() {
    setUiOpen((v) => !v);
  }

  const playerTimeLabel = useMemo(() => {
    if (!playerPoints.length) return "—";
    const p = playerPoints[playerIdx];
    if (!p?.time) return "—";
    return fmtDateTime(p.time);
  }, [playerPoints, playerIdx]);

  const playerSpeedLabel = useMemo(() => {
    if (!playerPoints.length) return "—";
    const p = playerPoints[playerIdx];
    return `${Number(p?.speed ?? 0).toFixed(0)} km/h`;
  }, [playerPoints, playerIdx]);

  function flyToStop(s) {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [s.lon, s.lat],
      zoom: 16,
      speed: 0.9,
    });
  }

  // =======================
  // SELECCIÓN
  // =======================
  const selectedUnit = useMemo(() => {
    if (selectedUnitId != null) return units.find((u) => u.id === selectedUnitId) ?? null;
    return null;
  }, [units, selectedUnitId]);

  const selectedSpeed = Number(selectedUnit?.pos?.s ?? 0);
  const selectedT = selectedUnit?.pos?.t;
  const selectedStale = selectedT ? Math.floor(Date.now() / 1000) - selectedT > 600 : true;
  const selectedKind =
    selectedStale ? "stale" : selectedSpeed <= 2 ? "stop" : "move";
  const selectedStatusTxt =
    selectedKind === "stale"
      ? "Sin actualización"
      : selectedKind === "stop"
        ? "Detenido"
        : "En movimiento";

  // ✅ PRESETS HISTORIAL (mejora UI)
  function setHistoryRangePreset(kind) {
    const now = new Date();
    const to = new Date(now);

    const from = new Date(now);
    if (kind === "hoy") {
      from.setHours(0, 0, 0, 0);
    } else if (kind === "6h") {
      from.setHours(from.getHours() - 6);
    } else if (kind === "24h") {
      from.setHours(from.getHours() - 24);
    } else if (kind === "3d") {
      from.setDate(from.getDate() - 3);
    }

    setHistoryFrom(toDatetimeLocalValue(from));
    setHistoryTo(toDatetimeLocalValue(to));
  }

  // reverse geocode (Mapbox)
  useEffect(() => {
    let abort = false;
    const run = async () => {
      if (!selectedUnit?.pos) {
        setSelectedAddress("");
        return;
      }
      const lon = selectedUnit.pos.x;
      const lat = selectedUnit.pos.y;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        setSelectedAddress("");
        return;
      }
      if (!mapboxgl.accessToken) {
        setSelectedAddress("");
        return;
      }

      setSelectedAddress("Buscando dirección…");

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?language=es&limit=1&access_token=${mapboxgl.accessToken}`;
        const r = await fetch(url);
        const j = await r.json();
        const place = j?.features?.[0]?.place_name;
        if (abort) return;
        setSelectedAddress(place ? String(place) : "");
      } catch {
        if (abort) return;
        setSelectedAddress("");
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      abort = true;
      window.clearTimeout(t);
    };
  }, [selectedUnit?.id, selectedUnit?.pos?.x, selectedUnit?.pos?.y]);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {focusMode && <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" />}

      <div className="fixed right-3 top-24 z-50">
        <FabButton
          icon={uiOpen ? "✕" : "☰"}
          label={uiOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={toggleUI}
          className={
            uiOpen ? "bg-red-600 hover:bg-red-500 text-white" : "bg-black/80 hover:bg-black text-white"
          }
        />
      </div>

      {/* PANEL RÁPIDO */}
      {selectedUnit?.pos && quickPanelOpen && (
        <div
          className={[
            "fixed left-3 bottom-6 z-50 w-[360px] max-w-[92vw]",
            "rounded-3xl backdrop-blur-xl",
            "bg-gradient-to-b from-black/70 to-black/55",
            "ring-1 ring-white/10 shadow-2xl",
            "overflow-hidden",
            historyOpen ? "bottom-[360px] md:bottom-6 md:left-[410px]" : "",
          ].join(" ")}
          // ✅ YA NO DESHABILITAMOS el mapa con hover (esto era el bug)
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">📌 {selectedUnit.nm}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <ChipDark>{selectedStatusTxt}</ChipDark>
                  <ChipDark>💨 {selectedSpeed.toFixed(0)} km/h</ChipDark>
                  <ChipDark>🕒 {fmtAgo(selectedT)}</ChipDark>
                </div>
                <div className="mt-2 text-[11px] text-white/70 break-words max-h-10 overflow-hidden">
                  {selectedAddress ? selectedAddress : "—"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-xl grid place-items-center bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/10 transition active:scale-[0.98]"
                  title="Limpiar ruta"
                  onClick={() => clearAssistRoute()}
                >
                  🧹
                </button>

                <button
                  className="h-9 w-9 rounded-xl grid place-items-center bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/10 transition active:scale-[0.98]"
                  title="Cerrar"
                  onClick={() => setQuickPanelOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                onClick={async () => {
                  const txt = `${selectedUnit.pos.y},${selectedUnit.pos.x}`;
                  await copyToClipboard(txt);
                }}
              >
                📋 Copiar coords
              </button>

              <button
                className="rounded-2xl px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                onClick={() => openGoogleMaps(selectedUnit.pos.y, selectedUnit.pos.x)}
              >
                🌎 Ver en Maps
              </button>
            </div>

            <button
              className={[
                "w-full rounded-2xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10 transition",
                assistMode
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-orange-500 hover:bg-orange-400 text-black",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              ].join(" ")}
              disabled={assistLoading}
              onClick={() => {
                setAssistMsg("Da click en el mapa para definir destino…");
                setAssistMode(true);
              }}
            >
              {assistLoading
                ? "Calculando…"
                : assistMode
                  ? "🟡 Click en mapa para destino…"
                  : "🧭 Crear ruta (desde unidad)"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10 disabled:opacity-40"
                disabled={!assistDest || !selectedUnit?.pos}
                onClick={() => {
                  if (!assistDest || !selectedUnit?.pos) return;
                  openGoogleMapsDirections(
                    selectedUnit.pos.y,
                    selectedUnit.pos.x,
                    assistDest.lat,
                    assistDest.lon
                  );
                }}
              >
                🧭 Abrir ruta (Maps)
              </button>

              <button
                className="rounded-2xl px-3 py-2 text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-100 ring-1 ring-white/10"
                onClick={() => clearAssistRoute()}
              >
                ❌ Quitar ruta
              </button>
            </div>

            {assistMsg && <div className="text-[11px] text-white/70">{assistMsg}</div>}
          </div>
        </div>
      )}

      {/* ✅ MENÚS */}
      {uiOpen && (
        <>
          {/* PANEL HISTORIAL */}
          {historyOpen && (
            <div
              className={[
                "fixed left-6 bottom-6 z-50 w-[430px] max-w-[92vw] max-h-[80vh]",
                "rounded-3xl backdrop-blur-xl overflow-hidden",
                "bg-gradient-to-b from-black/75 to-black/60",
                "ring-1 ring-white/10 shadow-2xl",
              ].join(" ")}
              // ✅ sin hover lock
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* ... (el resto del panel historial es igual al tuyo) */}
              {/* Para no romper nada, dejo tu panel completo tal cual lo pegaste: */}
              <div>
                <div className="sticky top-0 z-10 px-4 pt-4 pb-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">🧭 Historial</div>
                      <div className="text-[11px] text-white/60">
                        {selectedUnit ? (
                          <>
                            Unidad:{" "}
                            <span className="text-white/85 font-semibold">{selectedUnit.nm}</span>{" "}
                            <span className="text-white/40">({selectedUnitId ?? "—"})</span>
                          </>
                        ) : (
                          "Selecciona una unidad y consulta un rango"
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                          onClick={() => setHistoryRangePreset("hoy")}
                        >
                          Hoy
                        </button>
                        <button
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                          onClick={() => setHistoryRangePreset("6h")}
                        >
                          6h
                        </button>
                        <button
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                          onClick={() => setHistoryRangePreset("24h")}
                        >
                          24h
                        </button>
                        <button
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10"
                          onClick={() => setHistoryRangePreset("3d")}
                        >
                          3 días
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setHistoryOpen(false)}
                      className="h-9 w-9 rounded-xl grid place-items-center bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/10 transition active:scale-[0.98]"
                      title="Cerrar"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/6 ring-1 ring-white/10 px-2 py-0.5 text-[11px] text-white/80">
                      Puntos:{" "}
                      <span className="ml-1 text-white font-semibold">{historyAllPoints.length}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/6 ring-1 ring-white/10 px-2 py-0.5 text-[11px] text-white/80">
                      Paradas:{" "}
                      <span className="ml-1 text-white font-semibold">{stopsList.length}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/6 ring-1 ring-white/10 px-2 py-0.5 text-[11px] text-white/80">
                      Detección:{" "}
                      <span className="ml-1 text-white font-semibold">
                        {historyDetectTrips ? "Sí" : "No"}
                      </span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/6 ring-1 ring-white/10 px-2 py-0.5 text-[11px] text-white/80">
                      Min stop:{" "}
                      <span className="ml-1 text-white font-semibold">{fmtStop(historyMinStopSec)}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[68vh] custom-scroll">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] mb-1 text-white/60">Fecha inicial</div>
                      <input
                        type="datetime-local"
                        value={historyFrom}
                        onChange={(e) => setHistoryFrom(e.target.value)}
                        className={[
                          "w-full rounded-2xl px-3 py-2 text-xs text-white",
                          "bg-black/30 border border-white/10",
                          "focus:outline-none focus:ring-2 focus:ring-yellow-400/30",
                        ].join(" ")}
                      />
                    </div>

                    <div>
                      <div className="text-[11px] mb-1 text-white/60">Fecha final</div>
                      <input
                        type="datetime-local"
                        value={historyTo}
                        onChange={(e) => setHistoryTo(e.target.value)}
                        className={[
                          "w-full rounded-2xl px-3 py-2 text-xs text-white",
                          "bg-black/30 border border-white/10",
                          "focus:outline-none focus:ring-2 focus:ring-yellow-400/30",
                        ].join(" ")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                      <div className="text-[11px] text-white/60 mb-1">Detección de recorridos</div>
                      <select
                        value={historyDetectTrips ? "si" : "no"}
                        onChange={(e) => setHistoryDetectTrips(e.target.value === "si")}
                        className={[
                          "w-full rounded-xl px-3 py-2 text-xs text-white",
                          "bg-black/30 border border-white/10",
                          "focus:outline-none focus:ring-2 focus:ring-yellow-400/30",
                        ].join(" ")}
                      >
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                      <div className="text-[11px] text-white/60 mb-1">Parada mínima</div>
                      <select
                        value={historyMinStopSec}
                        onChange={(e) => setHistoryMinStopSec(Number(e.target.value))}
                        className={[
                          "w-full rounded-xl px-3 py-2 text-xs text-white",
                          "bg-black/30 border border-white/10",
                          "focus:outline-none focus:ring-2 focus:ring-yellow-400/30",
                        ].join(" ")}
                      >
                        <option value={300}>5 min</option>
                        <option value={600}>10 min</option>
                        <option value={900}>15 min</option>
                        <option value={1800}>30 min</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => consultarHistorial(historyUnitId)}
                      disabled={historyLoading}
                      className={[
                        "col-span-2 rounded-2xl px-3 py-2 text-xs font-semibold",
                        "bg-yellow-400 text-black hover:bg-yellow-300",
                        "transition disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      {historyLoading ? "Consultando…" : "Consultar"}
                    </button>

                    <button
                      onClick={() => setHistoryVisible(true)}
                      disabled={!historyDataRaw}
                      className={[
                        "rounded-2xl px-3 py-2 text-xs font-semibold",
                        "bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10",
                        "transition disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      Ver
                    </button>

                    <button
                      onClick={() => exportHistoryCSV(historyAllPoints, historyUnitId)}
                      disabled={!historyAllPoints.length}
                      className={[
                        "col-span-3 rounded-2xl px-3 py-2 text-xs font-semibold",
                        "bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10",
                        "transition disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                      title="Exportar puntos a CSV"
                    >
                      Exportar CSV
                    </button>

                    <button
                      onClick={borrarHistorial}
                      disabled={historyLoading || (!historyDataRaw && !historyRouteData)}
                      className={[
                        "col-span-3 rounded-2xl px-3 py-2 text-xs font-semibold",
                        "bg-red-500/30 hover:bg-red-500/40 text-white ring-1 ring-white/10",
                        "transition disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      Borrar historial
                    </button>
                  </div>

                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white">🎬 Reproductor</div>
                      <button
                        onClick={() => setPlayerOpen((v) => !v)}
                        className="text-[11px] bg-white/10 hover:bg-white/15 px-2 py-1 rounded-xl text-white ring-1 ring-white/10"
                        disabled={!playerPoints.length}
                      >
                        {playerOpen ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>

                    {playerOpen && (
                      <div className="mt-2">
                        <div className="text-[11px] text-white/70">
                          Punto {playerPoints.length ? playerIdx + 1 : 0} / {playerPoints.length || 0} •{" "}
                          {playerTimeLabel} •{" "}
                          <span className="font-semibold text-white">{playerSpeedLabel}</span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, playerPoints.length - 1)}
                          value={playerIdx}
                          onChange={(e) => {
                            stopPlayer();
                            setPlayerIdx(Number(e.target.value));
                          }}
                          disabled={!playerPoints.length}
                          className="w-full mt-2"
                        />

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              stopPlayer();
                              setPlayerIdx((v) => Math.max(0, v - 1));
                            }}
                            disabled={!playerPoints.length || playerIdx <= 0}
                            className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white ring-1 ring-white/10 disabled:opacity-40"
                          >
                            ⏮
                          </button>

                          <button
                            onClick={() => {
                              if (!playerPoints.length) return;
                              setPlayerPlaying((v) => !v);
                            }}
                            disabled={!playerPoints.length}
                            className="px-3 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-semibold disabled:opacity-40"
                          >
                            {playerPlaying ? "⏸ Pausar" : "▶ Reproducir"}
                          </button>

                          <button
                            onClick={() => {
                              stopPlayer();
                              setPlayerIdx((v) => Math.min(playerPoints.length - 1, v + 1));
                            }}
                            disabled={!playerPoints.length || playerIdx >= playerPoints.length - 1}
                            className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white ring-1 ring-white/10 disabled:opacity-40"
                          >
                            ⏭
                          </button>

                          <button
                            onClick={() => {
                              stopPlayer();
                              setPlayerIdx(0);
                            }}
                            disabled={!playerPoints.length}
                            className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white ring-1 ring-white/10 disabled:opacity-40"
                            title="Reiniciar"
                          >
                            ⟲
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-2">
                            <div className="text-[11px] text-white/60 mb-1">Velocidad</div>
                            <select
                              value={playerSpeed}
                              onChange={(e) => setPlayerSpeed(Number(e.target.value))}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white bg-black/30 border border-white/10"
                              disabled={!playerPoints.length}
                            >
                              <option value={0.5}>0.5x</option>
                              <option value={1}>1x</option>
                              <option value={2}>2x</option>
                              <option value={4}>4x</option>
                              <option value={8}>8x</option>
                            </select>
                          </div>

                          <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-2">
                            <div className="text-[11px] text-white/60 mb-1">Cámara</div>
                            <button
                              onClick={() => setPlayerFollowCam((v) => !v)}
                              disabled={!playerPoints.length}
                              className={[
                                "w-full rounded-xl px-3 py-2 text-xs font-semibold transition",
                                playerFollowCam
                                  ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                                  : "bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10",
                                "disabled:opacity-40 disabled:cursor-not-allowed",
                              ].join(" ")}
                            >
                              {playerFollowCam ? "📍 Siguiendo" : "🧭 Libre"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white">📍 Paradas</div>
                      <div className="text-[11px] text-white/60">{stopsList.length} detectadas</div>
                    </div>

                    <div className="mt-2 max-h-[180px] overflow-y-auto pr-1 custom-scroll">
                      {!stopsList.length ? (
                        <div className="text-xs text-white/60">No hay paradas con el criterio actual.</div>
                      ) : (
                        stopsList.map((s, idx) => (
                          <div
                            key={`${s.from}-${idx}`}
                            className="flex items-center justify-between gap-2 py-2 px-2 rounded-2xl hover:bg-white/5"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white">Parada {fmtStop(s.dur)}</div>
                              <div className="text-[11px] text-white/60 truncate">
                                {fmtDateTime(s.from)} → {fmtDateTime(s.to)}
                              </div>
                            </div>

                            <button
                              onClick={() => flyToStop(s)}
                              className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-yellow-400 hover:bg-yellow-300 text-black"
                            >
                              Ir
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="text-xs">
                    {historyMessage ? (
                      <div className="text-white/60">{historyMessage}</div>
                    ) : (
                      <div className="text-white/70">
                        Historial cargado • puntos: {historyAllPoints.length} • paradas:{" "}
                        {stopsFC?.features?.length ?? 0}
                      </div>
                    )}
                  </div>
                </div>

                <style jsx>{`
                  .custom-scroll::-webkit-scrollbar {
                    width: 10px;
                  }
                  .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 999px;
                    border: 3px solid transparent;
                    background-clip: content-box;
                  }
                  .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.18);
                    border: 3px solid transparent;
                    background-clip: content-box;
                  }
                `}</style>
              </div>
            </div>
          )}

          {/* PANEL UNIDADES */}
          {openUnits && (
            <div
              className={[
                "fixed top-24 left-6 z-50 w-[360px] max-w-[92vw]",
                "rounded-3xl backdrop-blur-xl",
                "bg-gradient-to-b from-black/70 to-black/55",
                "ring-1 ring-white/10 shadow-2xl",
                "overflow-hidden",
              ].join(" ")}
              // ✅ sin hover lock
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">🚚</span>
                    <h2 className="text-lg font-bold tracking-tight truncate">Unidades</h2>
                    <span className="ml-2 text-[11px] text-white/60">{units.length} total</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFocusMode((v) => !v)}
                      className={[
                        "h-9 px-3 rounded-xl text-xs font-semibold",
                        "ring-1 ring-white/10 transition",
                        focusMode
                          ? "bg-yellow-400 text-black"
                          : "bg-white/5 hover:bg-white/10 text-white",
                      ].join(" ")}
                      title="Focus (F)"
                    >
                      Focus
                    </button>

                    <IconBtn
                      title="Cerrar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenUnits(false);
                      }}
                    >
                      ✕
                    </IconBtn>
                  </div>
                </div>

                <div className="mt-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔎</span>
                  <input
                    ref={unitsSearchInputRef}
                    className={[
                      "w-full h-10 pl-10 pr-3 rounded-2xl",
                      "bg-black/30 border border-white/10",
                      "text-white/90 placeholder:text-white/35 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-400/25",
                    ].join(" ")}
                    placeholder="Buscar unidad…  ( / )"
                    value={searchUnits}
                    onChange={(e) => setSearchUnits(e.target.value)}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-white/70">Mostrar / Ocultar todas</div>
                  <button
                    onClick={() => setAllUnitsVisibility(!allUnitsVisible)}
                    className={[
                      "h-9 px-3 rounded-xl text-xs font-semibold transition",
                      "ring-1 ring-white/10",
                      allUnitsVisible
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-100"
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-100",
                    ].join(" ")}
                  >
                    {allUnitsVisible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="max-h-[48vh] overflow-y-auto px-2 py-2 custom-scroll">
                {filteredUnits.map((u) => {
                  const isFollowing = followId === u.id;
                  const isSelected = selectedUnitId === u.id;
                  const isVisible = visibleUnits[u.id] ?? true;

                  const speed = Number(u.pos?.s ?? 0);
                  const t = u.pos?.t;

                  const stale = t ? Math.floor(Date.now() / 1000) - t > 600 : true;
                  const kind = stale ? "stale" : speed <= 2 ? "stop" : "move";

                  const statusTxt =
                    kind === "stale" ? "Sin actualización" : kind === "stop" ? "Detenido" : "En movimiento";

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        selectUnit(u.id);
                      }}
                      className={[
                        "mx-1 mb-2 rounded-2xl px-3 py-2 cursor-pointer transition",
                        "ring-1 ring-white/10",
                        isSelected ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <StatusDot kind={kind} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold truncate">{u.nm}</div>
                            {isFollowing && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-400 text-black font-semibold">
                                Siguiendo
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <ChipDark>{statusTxt}</ChipDark>
                            <ChipDark>💨 {speed.toFixed(0)} km/h</ChipDark>
                            <ChipDark>🕒 {fmtAgo(t)}</ChipDark>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <IconBtn
                            title="Ir a unidad"
                            onClick={(e) => {
                              e.stopPropagation();
                              centerUnit(u);
                            }}
                            small
                          >
                            📍
                          </IconBtn>

                          <IconBtn
                            title={isFollowing ? "Dejar de seguir" : "Seguir"}
                            onClick={(e) => {
                              e.stopPropagation();
                              isFollowing ? stopFollowOnly() : setFollowId(u.id);
                            }}
                            danger={isFollowing}
                            small
                          >
                            {isFollowing ? "⛔" : "⭐"}
                          </IconBtn>

                          <Toggle
                            value={isVisible}
                            title={isVisible ? "Ocultar" : "Mostrar"}
                            onChange={(next) => {
                              if (!next && followId === u.id) stopFollowOnly();
                              setVisibleUnits((p) => ({ ...p, [u.id]: next }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex items-center justify-between bg-white/5 rounded-2xl px-3 py-2 ring-1 ring-white/10">
                  <span className="text-xs text-white/70">Autocentrado</span>
                  <Toggle value={autoCenter} onChange={(next) => setAutoCenter(next)} />
                </div>

                <div className="mt-2 text-[11px] text-white/45">
                  Atajos: <span className="text-white/70">/</span> buscar •{" "}
                  <span className="text-white/70">u</span> unidades •{" "}
                  <span className="text-white/70">f</span> focus
                </div>
              </div>

              <style jsx>{`
                .custom-scroll::-webkit-scrollbar {
                  width: 10px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.12);
                  border-radius: 999px;
                  border: 3px solid transparent;
                  background-clip: content-box;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.18);
                  border: 3px solid transparent;
                  background-clip: content-box;
                }
              `}</style>
            </div>
          )}

          {/* PANEL GEOCERCAS */}
          {openGeos && (
            <div
              className={[
                "fixed top-24 left-6 z-50 w-[360px] max-w-[92vw]",
                "rounded-3xl backdrop-blur-xl",
                "bg-gradient-to-b from-black/70 to-black/55",
                "ring-1 ring-white/10 shadow-2xl",
                "overflow-hidden",
              ].join(" ")}
              // ✅ sin hover lock
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">📍</span>
                    <h2 className="text-lg font-bold tracking-tight truncate">Geocercas</h2>
                    <span className="ml-2 text-[11px] text-white/60">{totalGeos} total</span>
                  </div>

                  <button
                    onClick={() => setOpenGeos(false)}
                    className="h-9 w-9 rounded-xl grid place-items-center bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/10 transition active:scale-[0.98]"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔎</span>
                  <input
                    className={[
                      "w-full h-10 pl-10 pr-3 rounded-2xl",
                      "bg-black/30 border border-white/10",
                      "text-white/90 placeholder:text-white/35 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-pink-400/25",
                    ].join(" ")}
                    placeholder="Buscar geocerca…"
                    value={searchGeos}
                    onChange={(e) => setSearchGeos(e.target.value)}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-white/70">Mostrar / Ocultar todas</div>
                  <button
                    onClick={() => {
                      setHiddenGeos(() => {
                        if (allGeosVisible) return new Set(geos.map((g) => g.properties.name));
                        return new Set();
                      });
                    }}
                    className={[
                      "h-9 px-3 rounded-xl text-xs font-semibold transition ring-1 ring-white/10",
                      allGeosVisible
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-100"
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-100",
                    ].join(" ")}
                  >
                    {allGeosVisible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="px-2 py-2">
                <VirtualList
                  items={filteredGeoIndex.map((x) => ({ key: x.name }))}
                  height={geoListHeight}
                  rowHeight={GEO_ROW_H}
                  renderRow={(idx) => {
                    const x = filteredGeoIndex[idx];
                    const name = x.name;

                    const isVisible = !hiddenGeos.has(name);
                    const isSelected = highlight?.properties?.name === name;

                    return (
                      <GeoRow
                        name={name}
                        isSelected={isSelected}
                        isVisible={isVisible}
                        onGo={() => {
                          setHighlight(x.g);
                          zoomToGeo(x.g);
                        }}
                        onToggle={() => {
                          setHiddenGeos((prev) => {
                            const next = new Set(prev);
                            if (next.has(name)) next.delete(name);
                            else next.add(name);
                            return next;
                          });
                        }}
                      />
                    );
                  }}
                />
              </div>

              <div className="px-4 py-3 border-t border-white/10">
                <div className="text-[11px] text-white/60">
                  Total: {totalGeos} • Visibles: {visibleGeosCount} • Filtradas: {filteredGeoIndex.length}
                </div>
              </div>
            </div>
          )}

          {/* BOTONERA */}
          <div className="fixed right-3 top-40 flex flex-col gap-2 z-50">
            <FabButton
              icon="🚚"
              label={openUnits ? "Ocultar Unidades" : "Mostrar Unidades"}
              onClick={() => setOpenUnits((v) => !v)}
              className="bg-yellow-500 hover:bg-yellow-400 text-black"
            />

            <FabButton
              icon="📍"
              label={openGeos ? "Ocultar Geocercas" : "Mostrar Geocercas"}
              onClick={() => setOpenGeos((v) => !v)}
              className="bg-pink-500 hover:bg-pink-400 text-black"
            />

            <FabButton
              icon="🕘"
              label={historyOpen ? "Ocultar Historial" : "Mostrar Historial"}
              onClick={() => {
                const next = !historyOpen;
                setHistoryOpen(next);
                setHistoryVisible(next ? true : historyVisible);
              }}
              className={
                historyOpen
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }
            />

            <FabButton
              icon="⛔"
              label={followId ? "Dejar de seguir" : "No estás siguiendo"}
              onClick={() => stopFollowOnly()}
              disabled={!followId}
              className="bg-red-600 hover:bg-red-500 text-white"
            />

            <FabButton
              icon="🚦"
              label={showTraffic ? "Ocultar Tráfico" : "Mostrar Tráfico"}
              onClick={() => setShowTraffic((v) => !v)}
              className={showTraffic ? "bg-red-500 hover:bg-red-400" : "bg-gray-600 hover:bg-gray-500"}
            />

            <div className="h-px bg-white/10 my-1" />

            <FabButton
              icon="💹"
              label="Tráfico noche"
              onClick={() => setStyle("mapbox://styles/mapbox/traffic-night-v2")}
              className="bg-green-600 hover:bg-green-500 text-white"
            />

            <FabButton
              icon="☀️"
              label="Outdoors"
              onClick={() => setStyle("mapbox://styles/mapbox/outdoors-v12")}
              className="bg-gray-200 hover:bg-gray-100 text-black"
            />

            <FabButton
              icon="🌙"
              label="Oscuro"
              onClick={() => setStyle("mapbox://styles/mapbox/dark-v11")}
              className="bg-black hover:bg-zinc-900 text-white"
            />

            <FabButton
              icon="🛰"
              label="Satélite"
              onClick={() => setStyle("mapbox://styles/mapbox/satellite-v9")}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            />
          </div>
        </>
      )}
    </div>
  );
}
