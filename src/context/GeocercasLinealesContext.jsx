import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

const GeocercasLinealesContext = createContext(null);

/* ==============================
   FIX LINEALES → GEOJSON
================================ */
function fixLinea(linea) {
  if (!Array.isArray(linea.points) || linea.points.length < 2) return null;

  const coords = linea.points
    .map(p => [p.lon, p.lat])
    .filter(c => Number.isFinite(c[0]) && Number.isFinite(c[1]));

  if (coords.length < 2) return null;

  return {
    type: "Feature",
    properties: {
      id: linea.id,
      name: linea.name,
    },
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
  };
}

/* ==============================
   PROVIDER
================================ */
export function GeocercasLinealesProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const toastId = toast.loading("🛣️ Cargando geocercas lineales...");

    async function cargarLineales() {
      try {
        const resp = await fetch(
          "https://apipx.onrender.com/geofences/geofences/18891825/lines"
        );

        const json = await resp.json();
        const data = json?.data ?? [];

        const fixed = Array.isArray(data)
          ? data.map(fixLinea).filter(Boolean)
          : [];

        setLines(fixed);
        setReady(true);

        toast.update(toastId, {
          render: `✅ ${fixed.length} geocercas lineales`,
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });

        console.log("🛣️ Lineales cargadas:", fixed.length);
      } catch (e) {
        console.error("❌ Error lineales", e);
        toast.update(toastId, {
          render: "❌ Error cargando geocercas lineales",
          type: "error",
          isLoading: false,
        });
      }
    }

    cargarLineales();
  }, []);

  return (
    <GeocercasLinealesContext.Provider value={{ lines, ready }}>
      {children}
    </GeocercasLinealesContext.Provider>
  );
}

export function useGeocercasLineales() {
  return useContext(GeocercasLinealesContext);
}
