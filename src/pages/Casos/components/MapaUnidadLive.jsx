import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGeocercas } from "../../../context/GeocercasContext";
import { useGeocercasLineales } from "../../../context/GeocercasLinealesContext";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/* ==============================
   MARKER CAMIÓN
============================== */
function crearMarkerCamion(course = 0) {
  const el = document.createElement("div");
  el.innerHTML = `
    <svg width="42" height="42" viewBox="0 0 24 24"
      style="transform: rotate(${course}deg); filter: drop-shadow(0 0 6px rgba(0,0,0,0.6));">
      <path d="M12 2 L20 21 L12 17 L4 21 Z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
    </svg>`;
  el.style.cursor = "pointer";
  el.style.transformOrigin = "center";
  return el;
}

/* ==============================
   ENSURE ICONS
============================== */
const ensureLowSignalIcon = (map, cb) => {
  if (map.hasImage("low-signal-icon")) { cb(); return; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="8" y="40" width="10" height="16" rx="3" fill="#22c55e"/>
    <rect x="22" y="30" width="10" height="26" rx="3" fill="#d1d5db"/>
    <rect x="36" y="20" width="10" height="36" rx="3" fill="#d1d5db"/>
    <rect x="50" y="10" width="10" height="46" rx="3" fill="#d1d5db"/>
    <rect x="26" y="6" width="12" height="20" rx="6" fill="#ef4444"/>
    <circle cx="32" cy="34" r="5" fill="#ef4444"/>
  </svg>`;
  const img = new Image(64, 64);
  img.onload = () => { if (!map.hasImage("low-signal-icon")) map.addImage("low-signal-icon", img); cb(); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

const ensureRiskIcon = (map, cb) => {
  if (map.hasImage("risk-icon")) { cb(); return; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 6 L60 54 H4 Z" fill="#d4a600"/>
    <path d="M32 8 L58 52 H6 Z" fill="#facc15" stroke="#eab308" stroke-width="3" stroke-linejoin="round"/>
    <rect x="29" y="24" width="6" height="16" rx="3" fill="#ffffff"/>
    <circle cx="32" cy="46" r="4" fill="#ffffff"/>
  </svg>`;
  const img = new Image(64, 64);
  img.onload = () => { if (!map.hasImage("risk-icon")) map.addImage("risk-icon", img); cb(); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

const ensureRestaurantIcon = (map, cb) => {
  if (map.hasImage("restaurant-icon")) { cb(); return; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="18" fill="#ffffff" stroke="#9ca3af" stroke-width="3"/>
    <rect x="20" y="14" width="4" height="20" rx="2" fill="#374151"/>
    <rect x="40" y="14" width="4" height="20" rx="2" fill="#374151"/>
    <rect x="18" y="12" width="8" height="4" rx="2" fill="#374151"/>
    <rect x="38" y="12" width="8" height="4" rx="2" fill="#374151"/>
  </svg>`;
  const img = new Image(64, 64);
  img.onload = () => { map.addImage("restaurant-icon", img); cb(); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

const ensureCSTIcon = (map, cb) => {
  if (map.hasImage("cst-toll-icon")) { cb(); return; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <rect x="4" y="56" width="44" height="6" rx="2" fill="#b0b8c8"/>
    <rect x="6" y="30" width="36" height="28" rx="3" fill="#f5a623"/>
    <rect x="6" y="46" width="36" height="5" fill="#ffffff" opacity="0.4"/>
    <rect x="6" y="53" width="36" height="5" fill="#ffffff" opacity="0.4"/>
    <rect x="2" y="24" width="44" height="8" rx="2" fill="#5b7fa6"/>
    <rect x="14" y="33" width="16" height="12" rx="3" fill="#aed6f1" stroke="#5b7fa6" stroke-width="1.5"/>
    <line x1="22" y1="33" x2="22" y2="45" stroke="#5b7fa6" stroke-width="1" opacity="0.6"/>
    <rect x="21" y="20" width="6" height="5" rx="1" fill="#374151"/>
    <circle cx="24" cy="19" r="2" fill="#1f2937"/>
    <rect x="7" y="32" width="5" height="13" rx="1" fill="#374151"/>
    <circle cx="9.5" cy="34.5" r="1.5" fill="#ef4444"/>
    <circle cx="9.5" cy="38" r="1.5" fill="#f59e0b"/>
    <circle cx="9.5" cy="41.5" r="1.5" fill="#22c55e"/>
    <rect x="47" y="38" width="5" height="22" rx="2" fill="#6b7280"/>
    <line x1="50" y1="40" x2="76" y2="14" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="50" y1="40" x2="76" y2="14" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="5,5"/>
    <rect x="44" y="41" width="8" height="10" rx="2" fill="#4b5563"/>
    <rect x="8" y="48" width="22" height="9" rx="2" fill="#1e3a5f" opacity="0.88"/>
    <text x="19" y="55.5" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="6.5" fill="#ffffff" letter-spacing="0.8">CST</text>
  </svg>`;
  const img = new Image(80, 80);
  img.onload = () => { if (!map.hasImage("cst-toll-icon")) map.addImage("cst-toll-icon", img); cb(); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

/* ==============================
   MENU FLOTANTE
============================== */
function MenuFlotante({ evento, onAbrirModal }) {
  return (
    <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur shadow-xl rounded-xl p-4 w-64">
      <div className="text-xs space-y-1">
        <p><b>Estado:</b> {evento ? "En seguimiento" : "Cargando..."}</p>
        <p><b>Velocidad:</b> {evento?.speed ?? "--"} km/h</p>
        <p><b>Evento:</b> {evento?.evento ?? "--"}</p>
      </div>
      <button
        disabled={!evento}
        onClick={onAbrirModal}
        className="mt-3 w-full bg-blue-600 disabled:bg-gray-400 text-white text-xs py-2 rounded-lg"
      >
        Ver detalle completo
      </button>
    </div>
  );
}

/* ==============================
   MODAL GRANDE
============================== */
function ModalDetalle({ open, onClose, evento }) {
  if (!open || !evento) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[90%] max-w-3xl p-6">
        <h2 className="text-lg font-bold mb-4">Detalle de la unidad {evento.unitId}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><b>Lat:</b> {evento.lat}</div>
          <div><b>Lng:</b> {evento.lng}</div>
          <div><b>Velocidad:</b> {evento.speed} km/h</div>
          <div><b>Curso:</b> {evento.course}°</div>
          <div className="col-span-2"><b>Evento:</b> {evento.evento || "Movimiento"}</div>
        </div>
        <pre className="text-xs bg-gray-100 p-3 rounded mt-4 max-h-64 overflow-auto">
          {JSON.stringify(evento, null, 2)}
        </pre>
        <div className="text-right mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================
   HELPERS
============================== */
function crearCentroides(polys) {
  return polys.map((f) => {
    const coords = f.geometry.coordinates[0];
    let lng = 0, lat = 0;
    coords.forEach(([x, y]) => { lng += x; lat += y; });
    lng /= coords.length;
    lat /= coords.length;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { name: f.properties?.name ?? "" },
    };
  });
}

function crearLabelsLineales(lines) {
  return lines.map((f) => {
    const coords = f?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const mid = Math.floor(coords.length / 2);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords[mid] },
      properties: { name: f?.properties?.name ?? "" },
    };
  }).filter(Boolean);
}

/* ==============================
   COMPONENTE PRINCIPAL
============================== */
export default function MapaUnidadLive({ unitId, alerta }) {
  const [eventoActual, setEventoActual] = useState(
    alerta ? {
      unitId,
      lat: alerta.lat ?? null,
      lng: alerta.lng ?? null,
      evento: alerta.tipo,
      speed: alerta.velocidad ?? null,
      fecha: alerta.tsInc ?? Date.now(),
    } : null
  );

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const yaHizoZoomRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { polys, ready } = useGeocercas();
  const { lines, ready: linesReady } = useGeocercasLineales();

  /* ── Filtros reutilizables ───────────────────────────── */
  const isRiesgo = [">=", ["index-of", "riesgo", ["downcase", ["coalesce", ["get", "name"], ""]]], 0];
  const isBajaCobertura = [">=", ["index-of", "baja cobertura", ["downcase", ["coalesce", ["get", "name"], ""]]], 0];
  const isPA = [">=", ["index-of", "p.a", ["downcase", ["coalesce", ["get", "name"], ""]]], 0];
  const isCST = ["==", ["slice", ["downcase", ["coalesce", ["get", "name"], ""]], 0, 3], "cst"];

  /* ==============================
     1️⃣ CREAR MAPA
  ============================== */
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-102.5, 23.5],
      zoom: 5,
    });
    mapRef.current = map;
    map.on("load", () => setMapReady(true));
    return () => { setMapReady(false); map.remove(); };
  }, []);

  /* ==============================
     🔒 BLOQUEAR MAPA CUANDO MODAL
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (modalOpen) {
      map.scrollZoom.disable(); map.dragPan.disable();
      map.doubleClickZoom.disable(); map.boxZoom.disable();
      map.keyboard.disable(); map.touchZoomRotate.disable();
    } else {
      map.scrollZoom.enable(); map.dragPan.enable();
      map.doubleClickZoom.enable(); map.boxZoom.enable();
      map.keyboard.enable(); map.touchZoomRotate.enable();
    }
  }, [modalOpen]);

  /* ==============================
     2️⃣ GEOCERCAS POLIGONALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !ready || !polys.length) return;

    if (!map.getSource("geocercas")) {
      map.addSource("geocercas", { type: "geojson", data: { type: "FeatureCollection", features: polys } });
      map.addSource("geocercas-labels", { type: "geojson", data: { type: "FeatureCollection", features: crearCentroides(polys) } });

      // ── Fill con colores por tipo ──
      map.addLayer({
        id: "geocercas-fill", type: "fill", source: "geocercas",
        paint: {
          "fill-color": ["case", isRiesgo, "#dc2626", isBajaCobertura, "#facc15", isCST, "#1e3a5f", "#22c55e"],
          "fill-opacity": 0.22,
        },
      });

      // ── Borde con colores por tipo ──
      map.addLayer({
        id: "geocercas-line", type: "line", source: "geocercas",
        paint: {
          "line-color": ["case", isRiesgo, "#7f1d1d", isBajaCobertura, "#a16207", isCST, "#1e3a5f", "#15803d"],
          "line-width": 3,
        },
      });

      // ── Label ──
      map.addLayer({
        id: "geocercas-label", type: "symbol", source: "geocercas-labels", minzoom: 10,
        layout: {
          "text-field": ["get", "name"], "text-size": 12,
          "text-font": ["Open Sans Bold"], "text-anchor": "center", "text-allow-overlap": false,
        },
        paint: {
          "text-color": ["case", isRiesgo, "#7f1d1d", isBajaCobertura, "#713f12", isCST, "#1e3a5f", "#14532d"],
          "text-halo-color": "#ffffff", "text-halo-width": 1.5,
        },
      });

      // ── Ícono riesgo ──
      ensureRiskIcon(map, () => {
        map.addLayer({
          id: "geocercas-risk-icon", type: "symbol", source: "geocercas", filter: isRiesgo,
          layout: {
            "icon-image": "risk-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.35, 10, 0.5, 14, 0.75, 18, 1.0],
            "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

      // ── Ícono baja cobertura ──
      ensureLowSignalIcon(map, () => {
        map.addLayer({
          id: "geocercas-low-signal-icon", type: "symbol", source: "geocercas", filter: isBajaCobertura,
          layout: {
            "icon-image": "low-signal-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.30, 10, 0.5, 14, 0.7, 18, 0.95],
            "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

      // ── Ícono P.A. ──
      ensureRestaurantIcon(map, () => {
        map.addLayer({
          id: "geocercas-pa-icon", type: "symbol", source: "geocercas", filter: isPA,
          layout: {
            "icon-image": "restaurant-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.30, 10, 0.5, 14, 0.7, 18, 0.9],
            "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

      // ── Ícono CST ──
      ensureCSTIcon(map, () => {
        map.addLayer({
          id: "geocercas-cst-icon", type: "symbol", source: "geocercas", filter: isCST,
          layout: {
            "icon-image": "cst-toll-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.28, 10, 0.45, 14, 0.65, 18, 0.9],
            "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

    } else {
      map.getSource("geocercas").setData({ type: "FeatureCollection", features: polys });
      map.getSource("geocercas-labels")?.setData({ type: "FeatureCollection", features: crearCentroides(polys) });
    }
  }, [mapReady, ready, polys]);

  /* ==============================
     3️⃣ GEOCERCAS LINEALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !linesReady || !lines.length) return;

    if (!map.getSource("geocercas-lineales")) {
      map.addSource("geocercas-lineales", { type: "geojson", data: { type: "FeatureCollection", features: lines } });

      // ── Línea con colores por tipo ──
      map.addLayer({
        id: "geocercas-lineales", type: "line", source: "geocercas-lineales",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["case", isRiesgo, "#dc2626", isBajaCobertura, "#eab308", "#1e40af"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 3, 8, 6, 12, 12],
          "line-opacity": 0.9,
        },
      });

      // ── Ícono baja cobertura en lineales (zoom ≥ 10, 1 por línea) ──
      ensureLowSignalIcon(map, () => {
        map.addLayer({
          id: "geocercas-lineales-low-signal-icon", type: "symbol", source: "geocercas-lineales",
          minzoom: 10,
          filter: isBajaCobertura,
          layout: {
            "icon-image": "low-signal-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.8],
            "symbol-placement": "line-center",
            "symbol-spacing": 99999,
            "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

      // ── Ícono riesgo en lineales (zoom ≥ 10, 1 por línea) ──
      ensureRiskIcon(map, () => {
        map.addLayer({
          id: "geocercas-lineales-risk-icon", type: "symbol", source: "geocercas-lineales",
          minzoom: 10,
          filter: isRiesgo,
          layout: {
            "icon-image": "risk-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.8],
            "symbol-placement": "line-center",
            "symbol-spacing": 99999,
            "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
        });
      });

    } else {
      map.getSource("geocercas-lineales").setData({ type: "FeatureCollection", features: lines });
    }

    // ── Labels lineales ──
    if (!map.getSource("geocercas-lineales-labels")) {
      map.addSource("geocercas-lineales-labels", { type: "geojson", data: { type: "FeatureCollection", features: crearLabelsLineales(lines) } });
      map.addLayer({
        id: "geocercas-lineales-labels", type: "symbol", source: "geocercas-lineales-labels", minzoom: 9,
        layout: {
          "text-field": ["get", "name"], "text-size": 12,
          "text-font": ["Open Sans Bold"], "text-anchor": "center", "text-allow-overlap": false,
        },
        paint: {
          "text-color": ["case", isRiesgo, "#7f1d1d", isBajaCobertura, "#a16207", "#1e3a8a"],
          "text-halo-color": "#ffffff", "text-halo-width": 1.5,
        },
      });
    } else {
      map.getSource("geocercas-lineales-labels").setData({ type: "FeatureCollection", features: crearLabelsLineales(lines) });
    }
  }, [mapReady, linesReady, lines]);

  /* ==============================
     4️⃣ TRACKING UNIDAD
  ============================== */
  useEffect(() => {
    if (!mapRef.current || !unitId) return;

    const tick = async () => {
      const r = await fetch(`https://apipx.onrender.com/unidad/posicion?unitId=${unitId}`);
      const d = await r.json();
      if (!d?.ok) return;

      setEventoActual(d);
      const lngLat = [d.lng, d.lat];

      if (!markerRef.current) {
        const marker = new mapboxgl.Marker({ element: crearMarkerCamion(d.course) })
          .setLngLat(lngLat)
          .addTo(mapRef.current);
        marker.getElement().onclick = () => setModalOpen(true);
        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat(lngLat);
      }

      if (!yaHizoZoomRef.current) {
        mapRef.current.flyTo({ center: lngLat, zoom: 16, speed: 1.2, curve: 1.4, essential: true });
        yaHizoZoomRef.current = true;
      }
    };

    tick();
    const i = setInterval(tick, 2000);
    return () => clearInterval(i);
  }, [unitId]);

  /* ==============================
     RENDER
  ============================== */
  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <MenuFlotante evento={eventoActual} onAbrirModal={() => setModalOpen(true)} />
      <ModalDetalle open={modalOpen} onClose={() => setModalOpen(false)} evento={eventoActual} />
    </div>
  );
}
