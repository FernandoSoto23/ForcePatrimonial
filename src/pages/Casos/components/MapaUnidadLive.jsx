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
      style="
        transform: rotate(${course}deg);
        filter: drop-shadow(0 0 6px rgba(0,0,0,0.6));
      ">
      <path
        d="M12 2 L20 21 L12 17 L4 21 Z"
        fill="#dc2626"
        stroke="#ffffff"
        stroke-width="2"
      />
    </svg>
  `;

  el.style.cursor = "pointer";
  el.style.transformOrigin = "center";

  return el;
}



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
        <h2 className="text-lg font-bold mb-4">
          Detalle de la unidad {evento.unitId}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><b>Lat:</b> {evento.lat}</div>
          <div><b>Lng:</b> {evento.lng}</div>
          <div><b>Velocidad:</b> {evento.speed} km/h</div>
          <div><b>Curso:</b> {evento.course}°</div>
          <div className="col-span-2">
            <b>Evento:</b> {evento.evento || "Movimiento"}
          </div>
        </div>

        <pre className="text-xs bg-gray-100 p-3 rounded mt-4 max-h-64 overflow-auto">
          {JSON.stringify(evento, null, 2)}
        </pre>

        <div className="text-right mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================
   COMPONENTE PRINCIPAL
============================== */
export default function MapaUnidadLive({ unitId, alerta }) {
  const [eventoActual, setEventoActual] = useState(
    alerta
      ? {
        unitId,
        lat: alerta.lat ?? null,
        lng: alerta.lng ?? null,
        evento: alerta.tipo,
        speed: alerta.velocidad ?? null,
        fecha: alerta.tsInc ?? Date.now(),
      }
      : null
  );
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const yaHizoZoomRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { polys, ready } = useGeocercas();
  const { lines, ready: linesReady } = useGeocercasLineales();
  function convertirLinealesAGeoJSON(data) {
    return data.map((l) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: l.points.map(p => [p.lon, p.lat]),
      },
      properties: {
        id: l.id,
        name: l.name,
      },
    }));
  }
  function crearLabelsLineales(lines) {
    return lines
      .map((f) => {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;

        const mid = Math.floor(coords.length / 2);
        const midCoord = coords[mid];

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: midCoord },
          properties: {
            name: f?.properties?.name ?? "",
          },
        };
      })
      .filter(Boolean);
  }

  /* ==============================
     1️⃣ CREAR MAPA
  ============================== */
  function crearCentroides(polys) {
    return polys.map((f) => {
      const coords = f.geometry.coordinates[0];

      let lng = 0;
      let lat = 0;

      coords.forEach(([x, y]) => {
        lng += x;
        lat += y;
      });

      lng /= coords.length;
      lat /= coords.length;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: {
          name: f.properties?.name ?? "",
        },
      };
    });
  }

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

    return () => {
      setMapReady(false);
      map.remove();
    };
  }, []);
  /* ==============================
     🔒 BLOQUEAR MAPA CUANDO MODAL
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (modalOpen) {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disable();
    } else {
      map.scrollZoom.enable();
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoomRotate.enable();
    }
  }, [modalOpen]);

  /* ==============================
     2️⃣ GEOCERCAS POLIGONALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !ready || !polys.length) return;

    if (!map.getSource("geocercas")) {
      map.addSource("geocercas", {
        type: "geojson",
        data: { type: "FeatureCollection", features: polys },
      });
      map.addSource("geocercas-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: crearCentroides(polys),
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
      map.addLayer({
        id: "geocercas-label",
        type: "symbol",
        source: "geocercas-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-font": ["Open Sans Bold"],
          "text-anchor": "center",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#14532d",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
        minzoom: 10,
      });


    } else {
      map.getSource("geocercas").setData({
        type: "FeatureCollection",
        features: polys,
      });
      map.getSource("geocercas-labels")?.setData({
        type: "FeatureCollection",
        features: crearCentroides(polys),
      });
    }
  }, [mapReady, ready, polys]);

  /* ==============================
     3️⃣ GEOCERCAS LINEALES
  ============================== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !linesReady || !lines.length) return;

    // SOURCE de líneas
    if (!map.getSource("geocercas-lineales")) {
      map.addSource("geocercas-lineales", {
        type: "geojson",
        data: { type: "FeatureCollection", features: lines },
      });

      map.addLayer({
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
        },
      });
    } else {
      map.getSource("geocercas-lineales").setData({
        type: "FeatureCollection",
        features: lines,
      });
    }

    // SOURCE de labels (puntos)
    if (!map.getSource("geocercas-lineales-labels")) {
      map.addSource("geocercas-lineales-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: crearLabelsLineales(lines),
        },
      });

      map.addLayer({
        id: "geocercas-lineales-labels",
        type: "symbol",
        source: "geocercas-lineales-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-font": ["Open Sans Bold"],
          "text-anchor": "center",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e3a8a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
        minzoom: 9,
      });
    } else {
      map.getSource("geocercas-lineales-labels").setData({
        type: "FeatureCollection",
        features: crearLabelsLineales(lines),
      });
    }
  }, [mapReady, linesReady, lines]);


  /* ==============================
     4️⃣ TRACKING UNIDAD
  ============================== */
  useEffect(() => {
    if (!mapRef.current || !unitId) return;

    const tick = async () => {
      const r = await fetch(
        `https://apipx.onrender.com/unidad/posicion?unitId=${unitId}`
      );
      const d = await r.json();
      if (!d?.ok) return;

      setEventoActual(d);

      const lngLat = [d.lng, d.lat];

      if (!markerRef.current) {
        const marker = new mapboxgl.Marker({
          element: crearMarkerCamion(d.course),
        })
          .setLngLat(lngLat)
          .addTo(mapRef.current);

        marker.getElement().onclick = () => setModalOpen(true);
        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat(lngLat);
      }

      if (!yaHizoZoomRef.current) {
        mapRef.current.flyTo({
          center: lngLat,
          zoom: 16,
          speed: 1.2,
          curve: 1.4,
          essential: true,
        });
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

      <MenuFlotante
        evento={eventoActual}
        onAbrirModal={() => setModalOpen(true)}
      />

      <ModalDetalle
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        evento={eventoActual}
      />
    </div>
  );
}


