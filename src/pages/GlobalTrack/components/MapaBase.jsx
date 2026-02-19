import { useEffect, useRef, useMemo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapaBase({
  mapRef,
  popupRef,
  mapStyle,
  units = [],
  geocercasGeoJSON,
  geocercasLinealesGeoJSON,
  followUnitId = null,
  setFollowUnitId = () => { },
  showInfoPopup = true,

  // ✅ NUEVAS PROPS PARA HISTORIAL
  historyData = [],
  showHistoryRoute = false,
  selectedStopIndex = null,
}) {
  const containerRef = useRef(null);
  const hoverPopupRef = useRef(null);

  // ✅ Estado para el panel de información fijo
  const [fixedPanelInfo, setFixedPanelInfo] = useState(null);

  // ✅ ruta de seguimiento
  const followPathRef = useRef([]);
  const lastFollowPosRef = useRef(null);

  // ✅ marcadores de historial
  const historyMarkersRef = useRef([]);

  // ✅ popup de parada seleccionada
  const stopPopupRef = useRef(null);

  // ✅ throttle
  const lastFollowTickRef = useRef(0);

  // ✅ cache geocerca
  const lastGeoCheckPosRef = useRef(null);
  const lastGeoResultRef = useRef({ geoNormal: null, geoLineal: null });

  // ✅ evitar bug close
  const closingByProgramRef = useRef(false);

  // ✅ zoom libre
  const userZoomingRef = useRef(false);
  const zoomTimeoutRef = useRef(null);

  // ✅ evita que el popup se borre cuando se oculta por showInfoPopup
  const popupHiddenByToggleRef = useRef(false);

  // ✅ evitar que se cierre por error
  const closingBecauseHideRef = useRef(false);

  // 🟡 paradas históricas (Wialon style)
  const historyStopsLayerAddedRef = useRef(false);

  // ✅ FIX: flags para evitar listeners duplicados
  const geocercasLinealesListenersAddedRef = useRef(false);
  const geocercasListenersAddedRef = useRef(false);
  const unitsListenersAddedRef = useRef(false);

  /* =========================
     ✅ ID UNIFICADO
  ========================= */
  const getUnitId = (u) => {
    return String(
      u.id ??
      u.unitId ??
      u.unit_id ??
      u.deviceId ??
      u.device_id ??
      u.imei ??
      u.id_device ??
      u.vehicle_id ??
      u.vehicleId ??
      ""
    );
  };

  /* =========================
     INDEX DE UNIDADES (ID → NOMBRE)
  ========================= */
  const unitNameById = useMemo(() => {
    const map = new Map();
    units.forEach((u) => {
      const id = getUnitId(u);
      const name =
        u.nm ||
        u.name ||
        u.alias ||
        u.device_name ||
        u.unit_name ||
        u.unidad ||
        "";
      map.set(id, name);
    });
    return map;
  }, [units]);

  /* =========================
     HELPERS
  ========================= */

  const getLat = (u) => Number(u.lat ?? u.latitude ?? u.latitud);
  const getLon = (u) => Number(u.lon ?? u.lng ?? u.longitude ?? u.longitud);

  const getHeading = (u) => Number(u.course ?? u.heading ?? u.angle ?? 0);

  const getUnitById = (id) => {
    const target = String(id);
    return units.find((x) => getUnitId(x) === target) || null;
  };

  const getUnitCoordsById = (id) => {
    const u = getUnitById(id);
    if (!u) return null;
    const lat = getLat(u);
    const lon = getLon(u);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return [lon, lat];
  };

  const getUnitSpeedById = (id) => {
    const u = getUnitById(id);
    return Number(u?.speed ?? u?.velocidad ?? u?.velocity ?? 0);
  };

  const getUnitSpeedLimitById = (id) => {
    const u = getUnitById(id);
    if (!u) return null;

    const raw =
      u.speedLimit ??
      u.speed_limit ??
      u.limiteVelocidad ??
      u.limite_velocidad ??
      u.maxSpeed ??
      u.max_speed ??
      u.limite ??
      null;

    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  /* =========================
     🔥 RUN WHEN STYLE READY
  ========================= */
  const runWhenReady = (map, fn) => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      fn();
      return;
    }

    const onReady = () => {
      try {
        fn();
      } catch (e) {
        console.warn("⚠️ Error en runWhenReady:", e);
      }
    };

    map.once("idle", onReady);
    map.once("styledata", onReady);
  };

  /* =========================
     ENSURE ICON EXISTS
  ========================= */
  /* =========================
   ⚠️ ENSURE RISK ICON
========================= */
  /* =========================
   ⚠️ ENSURE RISK ICON PRO
========================= */
  const ensureLowSignalIcon = (map, cb) => {
    if (map.hasImage("low-signal-icon")) {
      cb();
      return;
    }

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="8" y="40" width="10" height="16" rx="3" fill="#22c55e"/>
    <rect x="22" y="30" width="10" height="26" rx="3" fill="#d1d5db"/>
    <rect x="36" y="20" width="10" height="36" rx="3" fill="#d1d5db"/>
    <rect x="50" y="10" width="10" height="46" rx="3" fill="#d1d5db"/>
    <rect x="26" y="6" width="12" height="20" rx="6" fill="#ef4444"/>
    <circle cx="32" cy="34" r="5" fill="#ef4444"/>
  </svg>
  `;

    const img = new Image(64, 64);
    img.onload = () => {
      if (!map.hasImage("low-signal-icon")) {
        map.addImage("low-signal-icon", img);
      }
      cb();
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  const ensureWorkshopIcon = (map, cb) => {
    if (map.hasImage("workshop-icon")) {
      cb();
      return;
    }

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#111827">
      <path d="M38 8a10 10 0 0 0-6 17L18 39l-4 12 12-4 14-14a10 10 0 0 0-2-25z"/>
      <rect x="10" y="6" width="6" height="24" rx="2"/>
      <rect x="8" y="28" width="10" height="6" rx="2"/>
    </g>
  </svg>
  `;

    const img = new Image(64, 64);
    img.onload = () => {
      if (!map.hasImage("workshop-icon")) {
        map.addImage("workshop-icon", img);
      }
      cb();
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };


  const ensureRiskIcon = (map, cb) => {
    if (map.hasImage("risk-icon")) {
      cb();
      return;
    }

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <!-- Sombra suave -->
    <path d="M32 6 L60 54 H4 Z" fill="#d4a600"/>

    <!-- Triángulo principal -->
    <path d="M32 8 L58 52 H6 Z"
          fill="#facc15"
          stroke="#eab308"
          stroke-width="3"
          stroke-linejoin="round"/>

    <!-- Signo ! -->
    <rect x="29" y="24" width="6" height="16" rx="3" fill="#ffffff"/>
    <circle cx="32" cy="46" r="4" fill="#ffffff"/>
  </svg>
  `;

    const img = new Image(64, 64);
    img.onload = () => {
      if (!map.hasImage("risk-icon")) {
        map.addImage("risk-icon", img); // 🔥 SIN sdf para mantener colores exactos
      }
      cb();
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  const ensureRestaurantIcon = (map, cb) => {
    if (map.hasImage("restaurant-icon")) {
      cb();
      return;
    }

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <!-- Plato -->
    <circle cx="32" cy="32" r="18" fill="#ffffff" stroke="#9ca3af" stroke-width="3"/>
    <!-- Cubiertos -->
    <rect x="20" y="14" width="4" height="20" rx="2" fill="#374151"/>
    <rect x="40" y="14" width="4" height="20" rx="2" fill="#374151"/>
    <rect x="18" y="12" width="8" height="4" rx="2" fill="#374151"/>
    <rect x="38" y="12" width="8" height="4" rx="2" fill="#374151"/>
  </svg>
  `;

    const img = new Image(64, 64);
    img.onload = () => {
      map.addImage("restaurant-icon", img);
      cb();
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  /* =========================
     🔥 GEO HELPERS
  ========================= */
  const pointInPolygon = (point, polygon) => {
    let x = point[0],
      y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];

      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  };

  const findPolygonGeofenceName = (coords) => {
    const features = geocercasGeoJSON?.features || [];
    if (!features.length) return null;

    for (const f of features) {
      const g = f?.geometry;
      if (!g) continue;

      const name = f?.properties?.name || "Geocerca";

      if (g.type === "Polygon") {
        const ring = g.coordinates?.[0];
        if (Array.isArray(ring) && ring.length > 3) {
          if (pointInPolygon(coords, ring)) return name;

          const swapped = ring.map(([a, b]) => [b, a]);
          if (pointInPolygon(coords, swapped)) return name;
        }
      }

      if (g.type === "MultiPolygon") {
        const polys = g.coordinates || [];
        for (const p of polys) {
          const ring = p?.[0];
          if (Array.isArray(ring) && ring.length > 3) {
            if (pointInPolygon(coords, ring)) return name;

            const swapped = ring.map(([a, b]) => [b, a]);
            if (pointInPolygon(coords, swapped)) return name;
          }
        }
      }
    }

    return null;
  };

  const distPointToSegment = (p, a, b) => {
    const px = p[0],
      py = p[1];
    const ax = a[0],
      ay = a[1];
    const bx = b[0],
      by = b[1];

    const dx = bx - ax;
    const dy = by - ay;

    if (dx === 0 && dy === 0) {
      const vx = px - ax;
      const vy = py - ay;
      return Math.sqrt(vx * vx + vy * vy);
    }

    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const tt = Math.max(0, Math.min(1, t));

    const cx = ax + tt * dx;
    const cy = ay + tt * dy;

    const vx = px - cx;
    const vy = py - cy;

    return Math.sqrt(vx * vx + vy * vy);
  };

  const findLinearGeofenceName = (coords) => {
    const features = geocercasLinealesGeoJSON?.features || [];
    if (!features.length) return null;

    const TH = 0.00025;

    for (const f of features) {
      const g = f?.geometry;
      if (!g || g.type !== "LineString") continue;

      const name = f?.properties?.name || "Lineal";
      const line = g.coordinates || [];
      if (line.length < 2) continue;

      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const d = distPointToSegment(coords, a, b);
        if (d <= TH) return name;
      }
    }

    return null;
  };

  /* =========================
     ✅ MOVIMIENTO REAL
  ========================= */
  const movedEnoughForGeo = (coords) => {
    const last = lastGeoCheckPosRef.current;
    if (!last) return true;

    const TH = 0.00018;
    const dx = Math.abs(last[0] - coords[0]);
    const dy = Math.abs(last[1] - coords[1]);
    return dx > TH || dy > TH;
  };

  /* =========================
     ✅ HOVER TOOLTIP
  ========================= */
  const buildGeofenceHoverHTML = ({ name, type }) => {
    return `
    <div style="
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
      min-width: 160px;
      padding: 6px 8px;
      font-size: 12px;
      line-height: 1.25;
    ">
      <div style="font-weight:800; color:#111827;">
        📍 ${name || "Geocerca"}
      </div>
      <div style="margin-top:2px; color:#374151;">
        Tipo: ${type}
      </div>
    </div>
  `;
  };

  const buildHoverHTML = ({ name, speed, speedLimit }) => {
    const hasLimit = speedLimit != null;
    const exceeded = hasLimit && speed > speedLimit;

    return `
      <div style="
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
        min-width: 180px;
        padding: 6px 8px;
        font-size: 12px;
        line-height: 1.25;
      ">
        <div style="font-weight:800; color:#111827;">${name || "Unidad"}</div>
        <div style="margin-top:2px; color:#374151;">
          🚚 Velocidad: <b>${speed}</b> km/h
        </div>
        ${hasLimit
        ? `<div style="margin-top:2px; color:#374151;">
                 ⚠️ Límite: <b>${speedLimit}</b> km/h
                 ${exceeded
          ? `<span style="margin-left:6px; color:#ef4444; font-weight:800;">🚨</span>`
          : ``
        }
               </div>`
        : ``
      }
      </div>
    `;
  };

  /* =========================
     ✅ POPUP FOLLOW (panel)
  ========================= */
  const buildPopupHTML = ({ name, speed, speedLimit, geoNormal, geoLineal }) => {
    const speedColor = speed > 0 ? "#16a34a" : "#6b7280";
    const statusText =
      geoNormal || geoLineal ? "Dentro de geocerca" : "Fuera de geocerca";
    const statusColor = geoNormal || geoLineal ? "#16a34a" : "#ef4444";

    const hasLimit = speedLimit != null;
    const exceeded = hasLimit && speed > speedLimit;

    return `
      <div style="
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
        min-width: 230px;
        padding: 10px 12px;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-weight:800; font-size:14px; color:#111827;">
            ${name || "Unidad"}
          </div>
          <div style="
            font-size:12px;
            font-weight:700;
            padding: 4px 8px;
            border-radius: 999px;
            background: ${speed > 0 ? "#dcfce7" : "#f3f4f6"};
            color: ${speedColor};
            white-space:nowrap;
          ">
            ${speed} km/h
          </div>
        </div>

        ${hasLimit
        ? `
          <div style="margin-top:6px; font-size:12px; color:#374151;">
            ⚠️ Límite: <b>${speedLimit}</b> km/h
            ${exceeded
          ? `<span style="margin-left:8px; color:#ef4444; font-weight:800;">🚨 Exceso</span>`
          : ``
        }
          </div>
        `
        : ``
      }

        <div style="margin-top:6px; font-size:12px; color:${statusColor}; font-weight:700;">
          ${statusText}
        </div>

        <div style="margin-top:8px; font-size:12px; color:#374151; line-height:1.35;">
          ${geoNormal ? `<div><b>Geocerca:</b> ${geoNormal}</div>` : ""}
          ${geoLineal ? `<div><b>Lineal:</b> ${geoLineal}</div>` : ""}
          ${!geoNormal && !geoLineal
        ? `<div style="color:#6b7280;">Sin geocerca</div>`
        : ""
      }
        </div>
      </div>
    `;
  };

  /* =========================
     ✅ FORMATEAR TIEMPO HISTORIAL
  ========================= */
  const formatHistoryTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /* =========================
     ✅ CALCULAR PARADAS
  ========================= */
  const calculateStops = useMemo(() => {
    if (!showHistoryRoute || !historyData.length) return [];

    const stops = [];
    let start = null;

    for (let i = 0; i < historyData.length; i++) {
      const p = historyData[i];
      const speed = Number(p.speed ?? p.sp ?? 0);

      if (speed <= 2) {
        if (!start) start = { point: p, startIndex: i };
      } else if (start) {
        const from = start.point.time ?? start.point.t;
        const to = p.time ?? p.t;
        const duration = to - from;

        if (duration >= 600) {
          stops.push({
            index: stops.length,
            startIndex: start.startIndex,
            endIndex: i,
            lat: start.point.lat,
            lon: start.point.lon ?? start.point.lng,
            from,
            to,
            duration,
          });
        }
        start = null;
      }
    }

    return stops;
  }, [historyData, showHistoryRoute]);

  /* =========================
     🟡 DIBUJAR PARADAS HISTÓRICAS (WIALON)
  ========================= */
  const drawHistoryStops = (map) => {
    if (!showHistoryRoute || !historyData.length) {
      historyStopsLayerAddedRef.current = false;

      // ✅ FIX: limpiar layers y sources de paradas al desactivar
      if (map.getLayer("history-stops-layer")) map.removeLayer("history-stops-layer");
      if (map.getSource("history-stops")) map.removeSource("history-stops");
      return;
    }

    // limpiar si ya existían
    if (map.getLayer("history-stops-layer")) map.removeLayer("history-stops-layer");
    if (map.getSource("history-stops")) map.removeSource("history-stops");

    const features = calculateStops.map(stop => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [stop.lon, stop.lat],
      },
      properties: {
        stopIndex: stop.index,
        duration: stop.duration,
        from: stop.from,
        to: stop.to,
      },
    }));

    if (!features.length) return;

    map.addSource("history-stops", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.addLayer({
      id: "history-stops-layer",
      type: "circle",
      source: "history-stops",
      paint: {
        "circle-radius": 7,
        "circle-color": "#facc15",
        "circle-stroke-color": "#000",
        "circle-stroke-width": 2,
      },
    });

    // ✅ FIX: listeners solo una vez por layer creado
    map.on("mouseenter", "history-stops-layer", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features[0];
      const mins = Math.round(f.properties.duration / 60);

      hoverPopupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
        anchor: 'bottom-left'
      })
        .setLngLat(e.lngLat)
        .setHTML(`
        <div style="font-family:system-ui;font-size:12px">
          <b>⏸ Parada ${mins}m</b><br/>
          ${formatHistoryTime(f.properties.from)} →
          ${formatHistoryTime(f.properties.to)}
        </div>
      `)
        .addTo(map);
    });

    map.on("mouseleave", "history-stops-layer", () => {
      map.getCanvas().style.cursor = "";
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    });
  };

  /* =========================
     ✅ FOCUS EN PARADA SELECCIONADA
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedStopIndex === null || !calculateStops.length) {
      if (stopPopupRef.current) {
        stopPopupRef.current.remove();
        stopPopupRef.current = null;
      }
      return;
    }

    const stop = calculateStops.find(s => s.index === selectedStopIndex);
    if (!stop) return;

    const coords = [stop.lon, stop.lat];
    const mins = Math.round(stop.duration / 60);

    map.flyTo({
      center: coords,
      zoom: 16,
      duration: 1000,
    });

    if (stopPopupRef.current) {
      stopPopupRef.current.remove();
    }

    stopPopupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 15,
      anchor: 'bottom-left'
    })
      .setLngLat(coords)
      .setHTML(`
        <div style="
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
          padding: 8px 10px;
          min-width: 220px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: #facc15;
              border-radius: 50%;
              border: 2px solid #000;
            "></div>
            <strong style="font-size: 14px;">⏸ Parada ${mins}m</strong>
          </div>
          <div style="font-size: 12px; color: #374151; line-height: 1.4;">
            ${formatHistoryTime(stop.from)} — ${formatHistoryTime(stop.to).split(', ')[1]}
          </div>
        </div>
      `)
      .addTo(map);

    stopPopupRef.current.on('close', () => {
      stopPopupRef.current = null;
    });

  }, [selectedStopIndex, calculateStops]);

  /* =========================
     ✅ DIBUJAR RUTA HISTÓRICA
  ========================= */
  const drawHistoryRoute = (map) => {
    // Limpiar marcadores anteriores
    historyMarkersRef.current.forEach(marker => marker.remove());
    historyMarkersRef.current = [];

    if (!showHistoryRoute || !historyData || historyData.length === 0) {
      if (map.getLayer('history-route-outline')) map.removeLayer('history-route-outline');
      if (map.getLayer('history-route-layer')) map.removeLayer('history-route-layer');
      if (map.getSource('history-route')) map.removeSource('history-route');
      return;
    }

    const coordinates = historyData
      .filter(point =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lon ?? point.lng)
      )
      .map(point => [
        point.lon ?? point.lng,
        point.lat
      ]);

    if (coordinates.length === 0) return;

    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };

    const beforeId = map.getLayer("units-layer") ? "units-layer" : undefined;

    if (!map.getSource('history-route')) {
      map.addSource('history-route', {
        type: 'geojson',
        data: geojson
      });
    } else {
      map.getSource('history-route').setData(geojson);
    }

    if (!map.getLayer('history-route-outline')) {
      map.addLayer({
        id: 'history-route-outline',
        type: 'line',
        source: 'history-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 7,
          'line-opacity': 0.4
        }
      }, beforeId);
    }

    if (!map.getLayer('history-route-layer')) {
      map.addLayer({
        id: 'history-route-layer',
        type: 'line',
        source: 'history-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#9716a3',
          'line-width': 4,
          'line-opacity': 0.85
        }
      }, beforeId);
    }

    // Marcador INICIO (verde)
    const startEl = document.createElement('div');
    startEl.style.cssText = `
      background-color: #16a34a;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    const startMarker = new mapboxgl.Marker({ element: startEl })
      .setLngLat(coordinates[0])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 8px; font-family: system-ui;">
              <strong style="color: #16a34a;">🟢 Inicio</strong><br/>
              <small>${formatHistoryTime(historyData[0].time)}</small>
            </div>
          `)
      )
      .addTo(map);

    historyMarkersRef.current.push(startMarker);

    // Marcador FIN (rojo)
    const endEl = document.createElement('div');
    endEl.style.cssText = `
      background-color: #dc2626;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    const endMarker = new mapboxgl.Marker({ element: endEl })
      .setLngLat(coordinates[coordinates.length - 1])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 8px; font-family: system-ui;">
              <strong style="color: #dc2626;">🔴 Fin</strong><br/>
              <small>${formatHistoryTime(historyData[historyData.length - 1].time)}</small>
            </div>
          `)
      )
      .addTo(map);

    historyMarkersRef.current.push(endMarker);

    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 450, right: 50 },
      maxZoom: 15,
      duration: 1000
    });
  };

  /* =========================
     DRAW UNITS
  ========================= */
  const ensureUnitIcon = (map, cb) => {
    if (map.hasImage("unit-arrow")) {
      cb();
      return;
    }

    const svgArrow = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M32 2 L54 54 L32 46 L10 54 Z" fill="white"/>
    </svg>
  `;

    const img = new Image(44, 44);
    img.onload = () => {
      if (!map.hasImage("unit-arrow")) {
        map.addImage("unit-arrow", img, { sdf: true });
      }
      cb();
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgArrow);
  };

  const drawUnits = (map) => {
    ensureUnitIcon(map, () => {

      const features = units
        .map((u) => {
          const lat = getLat(u);
          const lon = getLon(u);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const name =
            u.nm ||
            u.name ||
            u.alias ||
            u.device_name ||
            u.unit_name ||
            u.unidad ||
            "";

          return {
            type: "Feature",
            properties: {
              id: getUnitId(u),
              name,
              speed: Number(u.speed ?? u.velocidad ?? 0),
              heading: getHeading(u),
            },
            geometry: {
              type: "Point",
              coordinates: [lon, lat],
            },


          };

        })
        .filter(Boolean);

      const geojson = { type: "FeatureCollection", features };

      if (!map.getSource("units")) {
        map.addSource("units", { type: "geojson", data: geojson });

        // ── Capa 1: Flecha moderna con rotación ──────────────────────
        map.addLayer({
          id: "units-layer",
          type: "symbol",
          source: "units",
          layout: {
            "icon-image": "unit-arrow",
            "icon-size": 0.72,
            "icon-rotate": ["get", "heading"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
          paint: {
            "icon-color": [
              "case",
              [">=", ["get", "speed"], 10],
              "#16a34a",   // verde — en movimiento normal (≥10 km/h)
              [">", ["get", "speed"], 0],
              "#eab308",   // amarillo — velocidad baja (1-9 km/h)
              "#dc2626",   // rojo — detenido (0 km/h)
            ],
            "icon-halo-color": [
              "case",
              [">=", ["get", "speed"], 10],
              "#052e16",   // halo verde oscuro
              [">", ["get", "speed"], 0],
              "#713f12",   // halo amarillo oscuro
              "#450a0a",   // halo rojo oscuro
            ],
            "icon-halo-width": 2,
            "icon-opacity": 1,
          },
        });



        // ✅ FIX: listeners de unidades solo una vez
        if (!unitsListenersAddedRef.current) {
          unitsListenersAddedRef.current = true;

          map.on("click", "units-layer", () => {
            // NO HACER NADA
          });

          map.on("mousemove", "units-layer", (e) => {
            const f = e.features?.[0];
            if (!f) return;

            const id = String(f.properties.id);
            const name =
              String(f.properties?.name || "").trim() ||
              unitNameById.get(id) ||
              "";

            const speed = getUnitSpeedById(id);
            const speedFinal = Number.isFinite(speed) ? speed : Number(f.properties.speed ?? 0);
            const speedLimit = getUnitSpeedLimitById(id);

            map.getCanvas().style.cursor = "pointer";

            if (!hoverPopupRef.current) {
              hoverPopupRef.current = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 15,
                anchor: 'bottom-left'
              });
            }

            hoverPopupRef.current
              .setLngLat(e.lngLat)
              .setHTML(buildHoverHTML({ name, speed: speedFinal, speedLimit }))
              .addTo(map);
          });

          map.on("mouseleave", "units-layer", () => {
            map.getCanvas().style.cursor = "";
            hoverPopupRef.current?.remove();
            hoverPopupRef.current = null;
          });
        }

      } else {
        // ✅ Solo actualizar datos, sin tocar layers ni listeners
        map.getSource("units").setData(geojson);
      }
    });
  };

  /* =========================
     GEOCERCAS NORMALES — ✅ FIX COMPLETO
  ========================= */
  const drawGeocercas = (map) => {
    if (!geocercasGeoJSON) return;

    if (map.getSource("geocercas")) {
      map.getSource("geocercas").setData(geocercasGeoJSON);
      return;
    }

    map.addSource("geocercas", {
      type: "geojson",
      data: geocercasGeoJSON,
    });

    const isRiesgo = [
      ">=",
      ["index-of", "riesgo", ["downcase", ["coalesce", ["get", "name"], ""]]],
      0,
    ];

    const isBajaCobertura = [
      ">=",
      ["index-of", "baja cobertura", ["downcase", ["coalesce", ["get", "name"], ""]]],
      0,
    ];
    const isPA = [
      "all",
      [">=", ["index-of", "p.a", ["downcase", ["coalesce", ["get", "name"], ""]]], 0]
    ];


    /* =========================
       POLÍGONO
    ========================= */

    map.addLayer({
      id: "geocercas-fill",
      type: "fill",
      source: "geocercas",
      paint: {
        "fill-color": [
          "case",
          isRiesgo, "#dc2626",
          isBajaCobertura, "#facc15",
          "#16a34a"
        ],
        "fill-opacity": 0.18,
      },
    });

    map.addLayer({
      id: "geocercas-line",
      type: "line",
      source: "geocercas",
      paint: {
        "line-color": [
          "case",
          isRiesgo, "#7f1d1d",
          isBajaCobertura, "#a16207",
          "#15803d"
        ],
        "line-width": 2,
      },
    });

    /* =========================
       ICONO RIESGO
    ========================= */
    ensureRiskIcon(map, () => {
      map.addLayer({
        id: "geocercas-risk-icon",
        type: "symbol",
        source: "geocercas",
        filter: isRiesgo,
        layout: {
          "icon-image": "risk-icon",

          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            5, 0.35,
            10, 0.5,
            14, 0.75,
            18, 1.0
          ],

          "icon-anchor": "bottom",

          "icon-offset": [
            "interpolate", ["linear"], ["zoom"],
            5, [0, -1],
            14, [0, -3],
            18, [0, -4]
          ],

          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    });

    /* =========================
       ICONO BAJA COBERTURA
    ========================= */
    ensureLowSignalIcon(map, () => {
      map.addLayer({
        id: "geocercas-low-signal-icon",
        type: "symbol",
        source: "geocercas",
        filter: isBajaCobertura,
        layout: {
          "icon-image": "low-signal-icon",

          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            5, 0.30,
            10, 0.5,
            14, 0.7,
            18, 0.95
          ],

          "icon-anchor": "bottom",

          "icon-offset": [
            "interpolate", ["linear"], ["zoom"],
            5, [0, -1],
            14, [0, -3],
            18, [0, -4]
          ],

          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    });
    ensureRestaurantIcon(map, () => {
      map.addLayer({
        id: "geocercas-pa-icon",
        type: "symbol",
        source: "geocercas",
        filter: isPA,
        layout: {
          "icon-image": "restaurant-icon",

          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            5, 0.30,
            10, 0.5,
            14, 0.7,
            18, 0.9
          ],

          "icon-anchor": "bottom",

          "icon-offset": [
            "interpolate", ["linear"], ["zoom"],
            5, [0, -1],
            14, [0, -3],
            18, [0, -4]
          ],

          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    });

    /* =========================
       LABEL
    ========================= */
    map.addLayer({
      id: "geocercas-label",
      type: "symbol",
      source: "geocercas",
      minzoom: 8,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],

        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          5, 9,
          10, 11,
          14, 13,
          18, 16
        ],

        "text-anchor": "top",

        "text-offset": [
          "interpolate", ["linear"], ["zoom"],
          5, [0, 0.3],
          14, [0, 0.6],
          18, [0, 0.8]
        ],

        "symbol-placement": "point",
      },
      paint: {
        "text-color": [
          "case",
          isRiesgo, "#7f1d1d",
          isBajaCobertura, "#713f12",
          "#14532d"
        ],
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  };


  /* =========================
     GEOCERCAS LINEALES — ✅ FIX COMPLETO
  ========================= */
  const drawGeocercasLineales = (map) => {
    if (!geocercasLinealesGeoJSON) return;

    if (map.getSource("geocercas-lineales")) {
      // ✅ Solo actualizar datos, NO re-agregar layers ni listeners
      map.getSource("geocercas-lineales").setData(geocercasLinealesGeoJSON);
      return;
    }

    // Reset flag de listeners al crear de nuevo
    geocercasLinealesListenersAddedRef.current = false;

    map.addSource("geocercas-lineales", {
      type: "geojson",
      data: geocercasLinealesGeoJSON,
    });

    // ✅ Verificar antes de agregar el layer
    if (!map.getLayer("geocercas-lineales-layer")) {
      map.addLayer({
        id: "geocercas-lineales-layer",
        type: "line",
        source: "geocercas-lineales",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1e40af",
          "line-width": 3,
          "line-opacity": 0.9
        },
      });
    }

    // ✅ FIX PRINCIPAL: registrar listeners SOLO UNA VEZ
    if (!geocercasLinealesListenersAddedRef.current) {
      geocercasLinealesListenersAddedRef.current = true;

      map.on("mousemove", "geocercas-lineales-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const name = f.properties?.name || "Geocerca lineal";
        map.getCanvas().style.cursor = "pointer";

        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            anchor: 'bottom-left'
          });
        }

        hoverPopupRef.current
          .setLngLat(e.lngLat)
          .setHTML(buildGeofenceHoverHTML({ name, type: "Lineal" }))
          .addTo(map);
      });

      map.on("mouseleave", "geocercas-lineales-layer", () => {
        map.getCanvas().style.cursor = "";
        hoverPopupRef.current?.remove();
        hoverPopupRef.current = null;
      });
    }
  };

  /* =========================
     ✅ RASTRO PRO
  ========================= */
  const ensureFollowRoute = (map) => {
    if (!map.getSource("follow-route")) {
      map.addSource("follow-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    const beforeId = map.getLayer("units-layer") ? "units-layer" : undefined;

    if (!map.getLayer("follow-route-outline")) {
      map.addLayer(
        {
          id: "follow-route-outline",
          type: "line",
          source: "follow-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#000", "line-width": 8, "line-opacity": 0.45 },
        },
        beforeId
      );
    }

    if (!map.getLayer("follow-route-layer")) {
      map.addLayer(
        {
          id: "follow-route-layer",
          type: "line",
          source: "follow-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#f97316",
            "line-width": 4,
            "line-opacity": 0.95,
          },
        },
        beforeId
      );
    }
  };

  const clearFollowRoute = (map) => {
    followPathRef.current = [];
    lastFollowPosRef.current = null;
    lastGeoCheckPosRef.current = null;
    lastGeoResultRef.current = { geoNormal: null, geoLineal: null };

    const src = map.getSource("follow-route");
    if (src) src.setData({ type: "FeatureCollection", features: [] });
  };

  const pushFollowPoint = (coords) => {
    const last = lastFollowPosRef.current;

    if (
      last &&
      Math.abs(last[0] - coords[0]) < 0.00001 &&
      Math.abs(last[1] - coords[1]) < 0.00001
    )
      return;

    lastFollowPosRef.current = coords;
    followPathRef.current.push(coords);

    if (followPathRef.current.length > 1200) {
      followPathRef.current.shift();
    }
  };

  const updateFollowRouteSource = (map) => {
    const path = followPathRef.current;
    if (path.length < 2) return;

    const src = map.getSource("follow-route");
    if (!src) return;

    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: path },
          properties: {},
        },
      ],
    });
  };

  /* =========================
     ✅ FOLLOW (PANEL FIJO ARRIBA DERECHA)
  ========================= */
  const followUnitTick = (map) => {
    if (!followUnitId) return;

    const now = Date.now();
    if (now - lastFollowTickRef.current < 750) return;
    lastFollowTickRef.current = now;

    const coords = getUnitCoordsById(followUnitId);
    if (!coords) return;

    if (!userZoomingRef.current) {
      map.easeTo({
        center: coords,
        zoom: map.getZoom(),
        duration: 450,
      });
    } else {
      map.easeTo({
        center: coords,
        duration: 450,
      });
    }

    ensureFollowRoute(map);
    pushFollowPoint(coords);
    updateFollowRouteSource(map);

    if (!showInfoPopup) {
      setFixedPanelInfo(null);
      return;
    }

    const id = String(followUnitId);
    const name = unitNameById.get(id) || "Unidad";
    const speed = getUnitSpeedById(id);
    const speedLimit = getUnitSpeedLimitById(id);

    let { geoNormal, geoLineal } = lastGeoResultRef.current;

    if (movedEnoughForGeo(coords)) {
      geoNormal = findPolygonGeofenceName(coords);
      geoLineal = findLinearGeofenceName(coords);

      lastGeoCheckPosRef.current = coords;
      lastGeoResultRef.current = { geoNormal, geoLineal };
    }

    setFixedPanelInfo({
      name,
      speed,
      speedLimit,
      geoNormal,
      geoLineal,
    });
  };

  /* =========================
     ✅ LIMPIAR LAYERS Y FLAGS AL CAMBIAR ESTILO
  ========================= */
  const resetLayerFlags = () => {
    geocercasLinealesListenersAddedRef.current = false;
    geocercasListenersAddedRef.current = false;
    unitsListenersAddedRef.current = false;
    historyStopsLayerAddedRef.current = false;
    // ✅ Limpiar badge layer en cambio de estilo (Mapbox lo borra pero reseteamos imagen)
    // Las imágenes SDF también se pierden al cambiar estilo
  };

  /* =========================
     INIT MAP
  ========================= */
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [-99.1332, 19.4326],
      zoom: 5,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("zoomstart", () => {
      userZoomingRef.current = true;
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);

      zoomTimeoutRef.current = setTimeout(() => {
        userZoomingRef.current = false;
      }, 1200);
    });

    map.on("load", () => {
      runWhenReady(map, () => {
        drawGeocercas(map);
        drawGeocercasLineales(map);
        drawUnits(map);
        drawHistoryRoute(map);
        drawHistoryStops(map);
        if (followUnitId) followUnitTick(map);
      });
    });

    return () => {
      historyMarkersRef.current.forEach(marker => marker.remove());
      if (stopPopupRef.current) stopPopupRef.current.remove();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     STYLE CHANGE — ✅ FIX: reset flags al cambiar estilo
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mapStyle);

    map.once("style.load", () => {
      // ✅ Resetear todos los flags porque el estilo limpia todo
      resetLayerFlags();

      runWhenReady(map, () => {
        drawGeocercas(map);
        drawGeocercasLineales(map);
        drawUnits(map);
        drawHistoryRoute(map);
        drawHistoryStops(map);

        if (followUnitId) {
          ensureFollowRoute(map);
          updateFollowRouteSource(map);
        }
      });
    });
  }, [mapStyle]);

  /* =========================
     UPDATE UNITS
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      drawUnits(map);
      if (followUnitId) followUnitTick(map);
    });
  }, [units, followUnitId, showInfoPopup]);

  /* =========================
     ✅ UPDATE HISTORY ROUTE
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      drawHistoryRoute(map);
      drawHistoryStops(map);
    });
  }, [historyData, showHistoryRoute]);

  /* =========================
     WHEN FOLLOW CHANGES
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      if (!followUnitId) {
        clearFollowRoute(map);
        setFixedPanelInfo(null);
        return;
      }

      ensureFollowRoute(map);
      clearFollowRoute(map);
      followUnitTick(map);
    });
  }, [followUnitId, showInfoPopup]);

  /* =========================
     UPDATE GEOCERCAS — ✅ FIX: ref para detectar cambios reales
     Evita re-ejecutar cuando el contexto dispara renders
     sin que los datos hayan cambiado realmente.
  ========================= */
  const prevGeocercasRefObj = useRef(null);
  const prevLinealesRefObj = useRef(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prevGeocercasRefObj.current === geocercasGeoJSON) return;
    prevGeocercasRefObj.current = geocercasGeoJSON;

    runWhenReady(map, () => {
      drawGeocercas(map);
      if (followUnitId) followUnitTick(map);
    });
  }, [geocercasGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prevLinealesRefObj.current === geocercasLinealesGeoJSON) return;
    prevLinealesRefObj.current = geocercasLinealesGeoJSON;

    runWhenReady(map, () => {
      drawGeocercasLineales(map);
      if (followUnitId) followUnitTick(map);
    });
  }, [geocercasLinealesGeoJSON]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* ✅ PANEL FIJO ARRIBA DERECHA */}
      {fixedPanelInfo && showInfoPopup && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '60px',
            zIndex: 1000,
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '260px',
            maxWidth: '320px',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          }}
        >
          {/* Header con botón cerrar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>
              {fixedPanelInfo.name || 'Unidad'}
            </div>
            <button
              onClick={() => {
                setFollowUnitId(null);
                const map = mapRef.current;
                if (map) clearFollowRoute(map);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#6b7280',
                padding: '0',
                lineHeight: '1',
              }}
            >
              ×
            </button>
          </div>

          {/* Contenido */}
          <div style={{ padding: '12px 14px' }}>
            {/* Velocidad */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#374151' }}>
                🚚 Velocidad
              </span>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background:
                    fixedPanelInfo.speed > 0 ? '#dcfce7' : '#f3f4f6',
                  color: fixedPanelInfo.speed > 0 ? '#16a34a' : '#6b7280',
                }}
              >
                {fixedPanelInfo.speed} km/h
              </div>
            </div>

            {/* Límite de velocidad */}
            {fixedPanelInfo.speedLimit != null && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#374151',
                  marginBottom: '10px',
                  padding: '6px 10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                }}
              >
                ⚠️ Límite: <strong>{fixedPanelInfo.speedLimit}</strong> km/h
                {fixedPanelInfo.speed > fixedPanelInfo.speedLimit && (
                  <span
                    style={{
                      marginLeft: '8px',
                      color: '#ef4444',
                      fontWeight: 800,
                    }}
                  >
                    🚨 Exceso
                  </span>
                )}
              </div>
            )}

            {/* Estado de geocerca */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '8px',
                color:
                  fixedPanelInfo.geoNormal || fixedPanelInfo.geoLineal
                    ? '#16a34a'
                    : '#ef4444',
              }}
            >
              {fixedPanelInfo.geoNormal || fixedPanelInfo.geoLineal
                ? '✓ Dentro de geocerca'
                : '✗ Fuera de geocerca'}
            </div>

            {/* Detalles de geocerca */}
            <div
              style={{
                fontSize: '12px',
                color: '#374151',
                lineHeight: '1.5',
                backgroundColor: '#f9fafb',
                padding: '8px 10px',
                borderRadius: '6px',
              }}
            >
              {fixedPanelInfo.geoNormal && (
                <div style={{ marginBottom: '4px' }}>
                  <strong>📍 Geocerca:</strong> {fixedPanelInfo.geoNormal}
                </div>
              )}
              {fixedPanelInfo.geoLineal && (
                <div>
                  <strong>📏 Lineal:</strong> {fixedPanelInfo.geoLineal}
                </div>
              )}
              {!fixedPanelInfo.geoNormal && !fixedPanelInfo.geoLineal && (
                <div style={{ color: '#9ca3af' }}>Sin geocerca asignada</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
