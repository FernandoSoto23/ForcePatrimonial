import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  loadGeocercasOnce,
  getGeocercasPolys,
  getGeocercasLines,
} from "../utils/geocercasCache";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const RADIO_METROS = 3000;

/* ===================== UTILIDADES ===================== */
function crearMarkerCamion(course) {
  const el = document.createElement("div");
  el.innerText = "🚚";
  el.style.fontSize = "32px";
  el.style.transform = `rotate(${course ?? 0}deg)`;
  el.style.transformOrigin = "center";
  return el;
}

function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroide(coords) {
  let lat = 0;
  let lon = 0;
  coords.forEach(([x, y]) => {
    lon += x;
    lat += y;
  });
  return {
    lon: lon / coords.length,
    lat: lat / coords.length,
  };
}

function lineaCercaDeUnidad(points, unitLat, unitLon, radio) {
  return points.some((p) => {
    const d = distanciaMetros(unitLat, unitLon, p.lat, p.lon);
    return d <= radio;
  });
}

/* ===================== COMPONENTE ===================== */
export default function MapaUnidadGeocercas({ unitId, alerta }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  const [unitPos, setUnitPos] = useState(null);
  const [geoPolys, setGeoPolys] = useState(null);
  const [geoLines, setGeoLines] = useState(null);

  const lastCalcRef = useRef(0);

  /* 1️⃣ MAPA */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-102.5, 23.5],
      zoom: 5,
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  /* 2️⃣ TRACKING UNIDAD */
  useEffect(() => {
    if (!mapRef.current) return;

    const tick = async () => {
      const r = await fetch(
        `https://apipx.onrender.com/unidad/posicion?unitId=${unitId}`
      );
      const d = await r.json();
      if (!d?.ok) return;

      setUnitPos(d);

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({
          element: crearMarkerCamion(d.course),
        })
          .setLngLat([d.lng, d.lat])
          .addTo(mapRef.current);

        mapRef.current.flyTo({ center: [d.lng, d.lat], zoom: 15 });
      } else {
        markerRef.current.setLngLat([d.lng, d.lat]);
      }
    };

    tick();
    const i = setInterval(tick, 2000);
    return () => clearInterval(i);
  }, [unitId]);

  /* 3️⃣ GEOFENCES (CACHE EN MEMORIA) */
  useEffect(() => {
    if (!unitPos) return;

    if (Date.now() - lastCalcRef.current < 10000) return;
    lastCalcRef.current = Date.now();

    loadGeocercasOnce().then(() => {
      const polys = getGeocercasPolys();
      const lines = getGeocercasLines();

      if (polys) {
        setGeoPolys({
          type: "FeatureCollection",
          features: polys.filter(
            (f) =>
              f.geometry?.type === "Polygon" &&
              distanciaMetros(
                unitPos.lat,
                unitPos.lng,
                centroide(f.geometry.coordinates[0]).lat,
                centroide(f.geometry.coordinates[0]).lon
              ) <= RADIO_METROS
          ),
        });
      }

      if (lines?.data) {
        setGeoLines({
          type: "FeatureCollection",
          features: lines.data
            .filter((g) =>
              lineaCercaDeUnidad(
                g.points,
                unitPos.lat,
                unitPos.lng,
                RADIO_METROS
              )
            )
            .map((g) => ({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: g.points.map((p) => [p.lon, p.lat]),
              },
            })),
        });
      }
    });
  }, [unitPos]);

  /* 4️⃣ CAPAS */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoPolys || !geoLines) return;

    if (!map.getSource("polys")) {
      map.addSource("polys", { type: "geojson", data: geoPolys });

      map.addLayer({
        id: "polys-fill",
        type: "fill",
        source: "polys",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "polys-line",
        type: "line",
        source: "polys",
        paint: {
          "line-color": "#15803d",
          "line-width": 3,
        },
      });
    }

    if (!map.getSource("lines")) {
      map.addSource("lines", { type: "geojson", data: geoLines });

      map.addLayer({
        id: "lines-layer",
        type: "line",
        source: "lines",
        paint: {
          "line-color": "#2563eb",
          "line-width": 30,
          "line-opacity": 0.9,
        },
      });
    }
  }, [geoPolys, geoLines]);

  /* RENDER */
  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />

      {unitPos && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white rounded-lg p-4 text-sm shadow-xl w-72 backdrop-blur">
          <div className="font-bold text-base mb-2 flex items-center gap-2">
            🚚 {unitPos.unidad}
          </div>

          {alerta && (
            <div className="mt-3 border-t border-white/20 pt-3">
              <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                🚨 Incidente / Alerta
              </div>

              <div className="mt-1 text-sm font-semibold text-red-200">
                {alerta.tipo}
              </div>

              {alerta.id && (
                <div className="text-[11px] text-gray-300">
                  ID alerta: {alerta.id}
                </div>
              )}

              <div className="mt-2 text-[11px] text-gray-200 max-h-24 overflow-auto whitespace-pre-wrap">
                {alerta.mensaje}
              </div>

              {alerta.tsInc && (
                <div className="mt-2 text-[10px] text-gray-400">
                  {new Date(alerta.tsInc).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1 text-[13px] mt-3">
            <div>
              <span className="text-gray-300">Velocidad:</span>{" "}
              <strong>{unitPos.speed} km/h</strong>
            </div>

            <div>
              <span className="text-gray-300">Rumbo:</span>{" "}
              <strong>{unitPos.course}°</strong>
            </div>

            <div>
              <span className="text-gray-300">Lat:</span>{" "}
              {unitPos.lat.toFixed(6)}
            </div>

            <div>
              <span className="text-gray-300">Lng:</span>{" "}
              {unitPos.lng.toFixed(6)}
            </div>

            <div className="pt-2 text-xs text-gray-400">
              Último reporte:
              <br />
              {new Date(unitPos.ts * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
