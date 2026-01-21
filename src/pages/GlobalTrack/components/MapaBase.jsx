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
}) {
  const containerRef = useRef(null);
  const hoverPopupRef = useRef(null);

  /* =========================
     INDEX DE UNIDADES (ID STRING → NOMBRE)
     🔥 ESTE ERA EL ERROR
  ========================= */
  const unitNameById = useMemo(() => {
    const map = new Map();
    units.forEach((u) => {
      const id = String(u.id); // 👈 NORMALIZADO
      const name =
        u.nm ||
        u.name ||
        u.alias ||
        u.device_name ||
        u.unit_name ||
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
  const getHeading = (u) =>
    Number(u.course ?? u.heading ?? u.angle ?? 0);

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
    img.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(svg);
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

          return {
            type: "Feature",
            properties: {
              id: String(u.id), // 👈 STRING
              speed: Number(u.speed ?? 0),
              heading: getHeading(u),
            },
            geometry: {
              type: "Point",
              coordinates: [lon, lat],
            },
          };
        })
        .filter(Boolean);

      const geojson = {
        type: "FeatureCollection",
        features,
      };

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

        /* ===== CLICK POPUP ===== */
        map.on("click", "units-layer", (e) => {
          const f = e.features?.[0];
          if (!f) return;

          const id = String(f.properties.id);
          const name = unitNameById.get(id) || "";

          popupRef?.current?.remove();
          popupRef.current = new mapboxgl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(
              `
              ${name ? `<strong>${name}</strong><br/>` : ""}
              Velocidad: ${f.properties.speed} km/h
              `
            )
            .addTo(map);
        });

        /* ===== HOVER (COMO WIALON) ===== */
        map.on("mousemove", "units-layer", (e) => {
          const f = e.features?.[0];
          if (!f) return;

          const id = String(f.properties.id);
          const name = unitNameById.get(id);
          if (!name) return;

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
            .setHTML(`<strong>${name}</strong>`)
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
     GEOCERCAS
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

    map.on("load", () => {
      drawGeocercas(map);
      drawUnits(map);
    });

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mapStyle);
    map.once("style.load", () => {
      drawGeocercas(map);
      drawUnits(map);
    });
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    drawUnits(map);
  }, [units]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    drawGeocercas(map);
  }, [geocercasGeoJSON]);

  return <div ref={containerRef} className="w-full h-full" />;
}
