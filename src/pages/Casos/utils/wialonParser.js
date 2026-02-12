/* =========================================================
   Utils
========================================================= */

const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const extractCoords = (url) => {
  if (!url) return {};
  const m = url.match(/q=([-0-9.]+),([-0-9.]+)/);
  if (!m) return {};
  return { lat: Number(m[1]), lon: Number(m[2]) };
};

/* =========================================================
   PARSER PRINCIPAL (FRONTEND)
========================================================= */

export function parseWialonMessage(rawMsg) {
  const raw = rawMsg.trim();
  const text = normalize(raw);

  /* ---------- Unidad ---------- */
  const unidadMatch =
    raw.match(/\bPXGL\s?[A-Z0-9]+\b/) ||
    raw.match(/\b[A-Z]{2,4}\s?M[-\s]?\d{3,6}\b/) ||
    raw.match(/\bITM\sM\d+\b/);

  const unidad = unidadMatch?.[0] ?? "SIN DATOS";

  /* ---------- Fecha / hora ---------- */
  const fecha = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const hora = raw.match(/\d{2}:\d{2}:\d{2}/)?.[0];

  /* ---------- Velocidad ---------- */
  const velMatch = raw.match(/velocidad (de )?(\d+)\s?km\/h/i);
  const velocidad = velMatch ? Number(velMatch[2]) : undefined;

  /* ---------- Maps ---------- */
  const mapsUrl = raw.match(/https:\/\/maps\.google\.com\/\?q=[^ ]+/)?.[0];
  const { lat, lon } = extractCoords(mapsUrl);

  /* ---------- Dirección ---------- */
  const dirMatch = raw.match(/cerca de ['"](.*?)['"]/i);
  const direccion = dirMatch?.[1];

  /* ---------- Tipo ---------- */
  let tipo = "DESCONOCIDO";

  if (text.includes("BOTON DE PANICO")) {
    tipo = "PANICO";
  } else if (
    text.includes("UNIDAD DETENIDA AUTORIZADA")
  ) {
    tipo = "UNIDAD_DETENIDA_AUTORIZADA";
  } else if (
    text.includes("UNIDAD DETENIDA NO AUTORIZADA") ||
    (text.includes("UNIDAD DETENIDA") && text.includes("NO AUTORIZADA"))
  ) {
    tipo = "UNIDAD_DETENIDA_NO_AUTORIZADA";
  } else if (text.includes("SIN SENAL") || text.includes("CONNECTION LOSS")) {
    tipo = "SIN_SEÑAL";
  } else if (text.includes("UNIDAD DETENIDA")) {
    tipo = "UNIDAD_DETENIDA";
  } else if (text.includes("JAMMER") || text.includes("ANTI-JAMMER")) {
    tipo = "JAMMER";
  } else if (text.includes("HORA DE NOTIFICACION")) {
    tipo = "INFORMATIVA";
  }

  /* ---------- Descripción corta ---------- */
  const descripcion = raw.split(".")[0]?.replace(/\s+/g, " ").trim() || raw;

  return {
    unidad,
    tipo,
    descripcion,
    fecha,
    hora,
    velocidad,
    direccion,
    lat,
    lon,
    mapsUrl,
    raw,
  };
}
