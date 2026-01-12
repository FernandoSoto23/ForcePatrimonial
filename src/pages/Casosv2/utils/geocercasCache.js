let geocercasPolys = [];
let geocercasLines = [];
let loadingPromise = null;

export async function loadGeocercasOnce() {
  if (geocercasPolys.length && geocercasLines.length) return;

  if (!loadingPromise) {
    loadingPromise = (async () => {
      console.log("🌐 Cargando TODAS las geocercas en memoria (una sola vez)");

      const [polysResp, linesResp] = await Promise.all([
        fetch("https://apipx.onrender.com/geofences/geofences/18891825/normal").then(r => r.json()),
        fetch("https://apipx.onrender.com/geofences/geofences/18891825/lines").then(r => r.json()),
      ]);

      geocercasPolys = Array.isArray(polysResp) ? polysResp : [];
      geocercasLines = Array.isArray(linesResp) ? linesResp : [];

      console.log("✅ Geocercas cargadas:", geocercasPolys.length);
    })();
  }

  await loadingPromise;
}

export function getGeocercasPolys() {
  return geocercasPolys;
}

export function getGeocercasLines() {
  return geocercasLines;
}
