import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGeocercas } from "../../../context/GeocercasContext";
import { useGeocercasLineales } from "../../../context/GeocercasLinealesContext";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function crearMarkerCamion(course = 0) {
  const el = document.createElement("div");
  el.innerText = "🚚";
  el.style.fontSize = "32px";
  el.style.transform = `rotate(${course}deg)`;
  el.style.transformOrigin = "center";
  return el;
}

export default function MapaUnidadLive({ unitId }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  const { polys, ready } = useGeocercas();
  const { lines, ready: linesReady } = useGeocercasLineales();

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

    map.on("load", () => {
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      map.remove();
    };
  }, []);

  /* ==============================
     2️⃣ GEOCERCAS POLIGONALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!ready || !polys.length) return;

    if (!map.getSource("geocercas")) {
      map.addSource("geocercas", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: polys,
        },
      });

      map.addLayer({
        id: "geocercas-fill",
        type: "fill",
        source: "geocercas",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "geocercas-line",
        type: "line",
        source: "geocercas",
        paint: {
          "line-color": "#15803d",
          "line-width": 3,
        },
      });
    } else {
      map.getSource("geocercas").setData({
        type: "FeatureCollection",
        features: polys,
      });
    }
  }, [mapReady, ready, polys]);

  /* ==============================
     3️⃣ GEOCERCAS LINEALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!linesReady || !lines.length) return;

    if (!map.getSource("geocercas-lineales")) {
      map.addSource("geocercas-lineales", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: lines,
        },
      });

      map.addLayer(
        {
          id: "geocercas-lineales",
          type: "line",
          source: "geocercas-lineales",
          paint: {
            "line-color": "#0000FF",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 3,
              8, 6,
              12, 12,
            ],
            "line-opacity": 1,
          },
        },
        map.getStyle().layers.at(-1).id
      );
    } else {
      map.getSource("geocercas-lineales").setData({
        type: "FeatureCollection",
        features: lines,
      });
    }
  }, [mapReady, linesReady, lines]);

  /* ==============================
     4️⃣ TRACKING UNIDAD
  ============================== */
  useEffect(() => {
    if (!mapRef.current) return;

    const tick = async () => {
      const r = await fetch(
        `https://apipx.onrender.com/unidad/posicion?unitId=${unitId}`
      );
      const d = await r.json();
      if (!d?.ok) return;

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({
          element: crearMarkerCamion(d.course),
        })
          .setLngLat([d.lng, d.lat])
          .addTo(mapRef.current);
      } else {
        markerRef.current.setLngLat([d.lng, d.lat]);
      }
    };

    tick();
    const i = setInterval(tick, 2000);
    return () => clearInterval(i);
  }, [unitId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
