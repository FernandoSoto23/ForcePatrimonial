
function extraerZonas(geocercas_json) {
  if (!geocercas_json) return [];

  try {
    const parsed = JSON.parse(geocercas_json);
    return Array.isArray(parsed?.zones) ? parsed.zones : [];
  } catch {
    return [];
  }
}
function extraerLatLng(mensaje) {
  const match = mensaje.match(/[-+]?\d+\.\d+,\s*[-+]?\d+\.\d+/);
  if (!match) return null;

  const [lat, lng] = match[0].split(",").map(Number);
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
}
export {
  extraerZonas,
  extraerLatLng,
}