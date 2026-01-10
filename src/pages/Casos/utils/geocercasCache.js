let geocercasPolys = null;
let geocercasLines = null;
let loadingPromise = null;

export async function loadGeocercasOnce() {
  if (geocercasPolys && geocercasLines) return;

  if (!loadingPromise) {
    loadingPromise = (async () => {
      console.log("🌐 Cargando TODAS las geocercas en memoria (una sola vez)");

      const [polys, lines] = await Promise.all([
        fetch("/api/wialon/geofences").then((r) => r.json()),
        fetch(
          "https://apipx.onrender.com/geofences/geofences/18891825/lines"
        ).then((r) => r.json()),
      ]);

      geocercasPolys = polys;
      geocercasLines = lines;

      console.log("✅ Geocercas cargadas en memoria");
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
