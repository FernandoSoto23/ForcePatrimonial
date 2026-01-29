"use client";

import { useEffect, useRef, useMemo } from "react";
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

  // ✅ mostrar/ocultar popup info (etiqueta)
  showInfoPopup = true,
}) {
  const containerRef = useRef(null);
  const hoverPopupRef = useRef(null);

  // ✅ ruta de seguimiento
  const followPathRef = useRef([]);
  const lastFollowPosRef = useRef(null);

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
  const ensureUnitIcon = (map, cb) => {
    if (map.hasImage("unit-cone")) {
      cb();
      return;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path fill="white" d="M256 0L96 512l160-96 160 96L256 0z"/>
      </svg>
    `;

    const img = new Image(26, 26);
    img.onload = () => {
      if (!map.hasImage("unit-cone")) {
        map.addImage("unit-cone", img, { sdf: true });
      }
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
     DRAW UNITS
  ========================= */
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

        map.addLayer({
          id: "units-layer",
          type: "symbol",
          source: "units",
          layout: {
            "icon-image": "unit-cone",
            "icon-size": 0.65,
            "icon-rotate": ["get", "heading"],
            "icon-allow-overlap": true,
          },
          paint: {
            "icon-color": [
              "case",
              [">", ["get", "speed"], 0],
              "#22c55e",
              "#ef4444",
            ],
            "icon-halo-color": "#000000",
            "icon-halo-width": 0.6,
          },
        });

        /* =========================================================
           ✅ CLICK DESACTIVADO (QUITAR ETIQUETA)
        ========================================================= */
        map.on("click", "units-layer", () => {
          // ✅ NO HACER NADA
          // (no popup al click)
        });

        /* =========================
           ✅ HOVER
        ========================= */
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
              offset: [0, -18],
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

      } else {
        map.getSource("units").setData(geojson);
      }
    });
  };

  /* =========================
     GEOCERCAS NORMALES
  ========================= */
  const drawGeocercas = (map) => {
    if (!geocercasGeoJSON) return;

    if (map.getSource("geocercas")) {
      map.getSource("geocercas").setData(geocercasGeoJSON);
      return;
    }

    map.addSource("geocercas", { type: "geojson", data: geocercasGeoJSON });

    map.addLayer({
      id: "geocercas-fill",
      type: "fill",
      source: "geocercas",
      paint: {
        "fill-color": "#2563eb",
        "fill-opacity": 0.25,
      },
    });

    map.addLayer({
      id: "geocercas-line",
      type: "line",
      source: "geocercas",
      paint: {
        "line-color": "#1e40af",
        "line-width": 2,
      },
    });
  };

  /* =========================
     GEOCERCAS LINEALES
  ========================= */
  const drawGeocercasLineales = (map) => {
    if (!geocercasLinealesGeoJSON) return;// =========================
    // ✅ HOVER GEOCERCAS LINEALES
    // =========================
    map.on("mousemove", "geocercas-lineales-layer", (e) => {
      const f = e.features?.[0];
      if (!f) return;

      const name = f.properties?.name || "Geocerca lineal";

      map.getCanvas().style.cursor = "pointer";

      if (!hoverPopupRef.current) {
        hoverPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -10],
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


    if (map.getSource("geocercas-lineales")) {
      map.getSource("geocercas-lineales").setData(geocercasLinealesGeoJSON);
      return;
    }

    map.addSource("geocercas-lineales", {
      type: "geojson",
      data: geocercasLinealesGeoJSON,
    });

    if (!map.getLayer("geocercas-lineales-layer")) {
      map.addLayer({
        id: "geocercas-lineales-layer",
        type: "line",
        source: "geocercas-lineales",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#00d0ff", "line-width": 3, "line-opacity": 0.9 },
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
     ✅ FOLLOW (POPUP COMO SIEMPRE)
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
      popupHiddenByToggleRef.current = true;
      closingBecauseHideRef.current = true;

      if (popupRef.current) {
        closingByProgramRef.current = true;
        popupRef.current.remove();
        popupRef.current = null;
        closingByProgramRef.current = false;
      }

      closingBecauseHideRef.current = false;
      return;
    }

    popupHiddenByToggleRef.current = false;

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

    const html = buildPopupHTML({ name, speed, speedLimit, geoNormal, geoLineal });

    if (popupRef.current) {
      closingByProgramRef.current = true;
      popupRef.current.setLngLat(coords).setHTML(html);
      closingByProgramRef.current = false;
    } else {
      popupRef.current = new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);

      popupRef.current.on("close", () => {
        if (closingByProgramRef.current) return;
        if (popupHiddenByToggleRef.current) return;
        if (closingBecauseHideRef.current) return;

        setFollowUnitId(null);
        clearFollowRoute(map);
        popupRef.current = null;
      });
    }
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

        if (followUnitId) followUnitTick(map);
      });
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     STYLE CHANGE
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mapStyle);

    map.once("style.load", () => {
      runWhenReady(map, () => {
        drawGeocercas(map);
        drawGeocercasLineales(map);
        drawUnits(map);

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
     WHEN FOLLOW CHANGES
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      if (!followUnitId) {
        clearFollowRoute(map);

        if (popupRef?.current) {
          closingByProgramRef.current = true;
          popupRef.current.remove();
          popupRef.current = null;
          closingByProgramRef.current = false;
        }

        return;
      }

      ensureFollowRoute(map);
      clearFollowRoute(map);
      followUnitTick(map);
    });
  }, [followUnitId, showInfoPopup]);

  /* =========================
     UPDATE GEOCERCAS
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      drawGeocercas(map);
      if (followUnitId) followUnitTick(map);
    });
  }, [geocercasGeoJSON?.features?.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    runWhenReady(map, () => {
      drawGeocercasLineales(map);
      if (followUnitId) followUnitTick(map);
    });
  }, [geocercasLinealesGeoJSON?.features?.length]);

  return <div ref={containerRef} className="w-full h-full" />;
}
