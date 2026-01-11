import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

/* ==============================
   CONTEXT
================================ */
const GeocercasContext = createContext(null);

/* ==============================
   FIX GEOJSON
================================ */
function cerrarPoligono(feature) {
  if (feature.geometry?.type !== "Polygon") return null;

  const ring = feature.geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const first = ring[0];
  const last = ring[ring.length - 1];

  const closed =
    first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];

  if (closed.length < 4) return null;

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: [closed],
    },
  };
}

/* ==============================
   PROVIDER
================================ */
export function GeocercasProvider({ children }) {
  const [polys, setPolys] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const toastId = toast.loading("🗺️ Cargando geocercas...");

    async function cargarGeocercas() {
      try {
        const resp = await fetch(
          "https://apipx.onrender.com/geofences/geofences/18891825/normal"
        );

        const data = await resp.json();

        const fixed = Array.isArray(data)
          ? data.map(cerrarPoligono).filter(Boolean)
          : [];

        setPolys(fixed);
        setReady(true);

        toast.update(toastId, {
          render: `✅ ${fixed.length} geocercas cargadas`,
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });

        console.log("✅ Geocercas cargadas:", fixed.length);
      } catch (e) {
        console.error("❌ Error cargando geocercas", e);

        toast.update(toastId, {
          render: "❌ Error cargando geocercas",
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      }
    }

    cargarGeocercas();
  }, []);

  return (
    <GeocercasContext.Provider value={{ polys, ready }}>
      {children}
    </GeocercasContext.Provider>
  );
}

/* ==============================
   HOOK
================================ */
export function useGeocercas() {
  return useContext(GeocercasContext);
}
