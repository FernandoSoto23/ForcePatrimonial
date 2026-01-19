import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { createRoot } from "react-dom/client";
import { FaLocationArrow } from "react-icons/fa";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/* =========================
   MAP STYLES
========================= */
function getMapStyle(mode) {
    switch (mode) {
        case "normal":
            return "mapbox://styles/mapbox/navigation-day-v1";
        case "satellite":
            return "mapbox://styles/mapbox/satellite-streets-v12";
        case "dark":
        default:
            return "mapbox://styles/mapbox/navigation-night-v1";
    }
}

/* =========================
   HELPERS
========================= */
function getLatLng(u) {
    let lat, lng;

    if (u.pos) {
        lat = u.pos.lat ?? u.pos.y;
        lng = u.pos.lng ?? u.pos.lon ?? u.pos.x;
    } else {
        lat = u.lat ?? u.latitude;
        lng = u.lng ?? u.lon ?? u.longitude;
    }

    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return [lng, lat];
}

function getHeading(u) {
    return u.course ?? u.heading ?? u.direction ?? 0;
}

function getSpeed(u) {
    return u.speed ?? u.spd ?? 0;
}

function getUnitColor(u) {
    const speed = getSpeed(u);
    if (speed > 15) return "#22c55e";
    if (speed > 1) return "#facc15";
    return "#ef4444";
}

/* =========================
   COMPONENT
========================= */
export default function MapaBase({
    mapRef,
    popupRef,
    mapMode,
    units,
}) {
    const containerRef = useRef(null);
    const markersRef = useRef(new Map());

    /* 🔥 TOGGLES */
    const [showUnits, setShowUnits] = useState(true);
    const [showGeocercas, setShowGeocercas] = useState(true);
    const [showLineales, setShowLineales] = useState(true);

    /* =========================
       INIT MAP
    ========================= */
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: containerRef.current,
            style: getMapStyle(mapMode),
            center: [-102.5528, 23.6345],
            zoom: 5,
        });

        popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    /* =========================
       DRAW UNITS
    ========================= */
    useEffect(() => {
        if (!mapRef.current || !Array.isArray(units)) return;

        const map = mapRef.current;
        const nextIds = new Set();

        if (!showUnits) {
            markersRef.current.forEach((m) => m.getElement().style.display = "none");
            return;
        }

        markersRef.current.forEach((m) => m.getElement().style.display = "block");

        units.forEach((u) => {
            const lngLat = getLatLng(u);
            if (!lngLat) return;

            const id = u.id ?? u.uid;
            nextIds.add(id);

            const color = getUnitColor(u);
            const heading = getHeading(u);

            if (markersRef.current.has(id)) {
                const m = markersRef.current.get(id);
                m.setLngLat(lngLat);
                m.setRotation(heading);
                return;
            }

            const el = document.createElement("div");
            el.style.width = "14px";
            el.style.height = "14px";

            const root = createRoot(el);
            root.render(
                <FaLocationArrow
                    size={12}
                    color={color}
                    style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,.8))" }}
                />
            );

            const marker = new mapboxgl.Marker({
                element: el,
                rotation: heading,
                rotationAlignment: "map",
            })
                .setLngLat(lngLat)
                .addTo(map);

            markersRef.current.set(id, marker);
        });

        markersRef.current.forEach((m, id) => {
            if (!nextIds.has(id)) {
                m.remove();
                markersRef.current.delete(id);
            }
        });
    }, [units, showUnits]);

    /* =========================
       TOGGLE GEOCERCAS
    ========================= */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        ["geocercas-fill", "geocercas-line", "geocercas-label"].forEach((id) => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(
                    id,
                    "visibility",
                    showGeocercas ? "visible" : "none"
                );
            }
        });
    }, [showGeocercas]);

    /* =========================
       TOGGLE LINEALES
    ========================= */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        ["geocercas-lineales", "geocercas-lineales-labels"].forEach((id) => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(
                    id,
                    "visibility",
                    showLineales ? "visible" : "none"
                );
            }
        });
    }, [showLineales]);

    /* =========================
       RENDER
    ========================= */
    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />

            {/* BOTONERA MAPA */}
            <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
                <button onClick={() => mapRef.current.setStyle(getMapStyle("normal"))} className="btn">Normal</button>
                <button onClick={() => mapRef.current.setStyle(getMapStyle("satellite"))} className="btn">Satélite</button>
                <button onClick={() => mapRef.current.setStyle(getMapStyle("dark"))} className="btn">Dark</button>
            </div>

            {/* PANEL TOGGLES */}
            <div className="absolute bottom-4 right-4 z-40 bg-black/70 text-white rounded-xl p-3 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showUnits} onChange={() => setShowUnits(v => !v)} />
                    Unidades
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showGeocercas} onChange={() => setShowGeocercas(v => !v)} />
                    Geocercas
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showLineales} onChange={() => setShowLineales(v => !v)} />
                    Lineales
                </label>
            </div>
        </div>
    );
}
