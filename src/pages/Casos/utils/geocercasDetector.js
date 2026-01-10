import { getGeocercasPolys, getGeocercasLines } from "./geocercasCache";

/* =====================
   UTILIDADES
===================== */

// 📍 Punto dentro de polígono (ray casting)
function puntoEnPoligono(lat, lon, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1];
    const yi = polygon[i][0];
    const xj = polygon[j][1];
    const yj = polygon[j][0];

    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

// 📏 Distancia Haversine
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

// 📐 Punto cerca de línea
function puntoCercaDeLinea(points, lat, lon, radio = 100) {
  return points.some((p) => distanciaMetros(lat, lon, p.lat, p.lon) <= radio);
}

/* =====================
   FUNCIÓN PRINCIPAL
===================== */
export function detectarGeocercasParaAlerta(lat, lon) {
  const resultado = [];

  const polys = getGeocercasPolys();
  const lines = getGeocercasLines();

  // 🔷 POLÍGONOS
  if (polys) {
    for (const f of polys) {
      if (f.geometry?.type !== "Polygon") continue;

      const ring = f.geometry.coordinates[0];
      if (!ring) continue;

      if (puntoEnPoligono(lat, lon, ring)) {
        resultado.push({
          id: f.id,
          name: f.properties?.name ?? "Geocerca",
          tipo: "POLIGONO",
        });
      }
    }
  }

  // 🟠 LÍNEAS
  if (lines?.data) {
    for (const g of lines.data) {
      if (puntoCercaDeLinea(g.points, lat, lon, 100)) {
        resultado.push({
          id: g.id,
          name: g.name,
          tipo: "LINEA",
        });
      }
    }
  }

  return resultado;
}
