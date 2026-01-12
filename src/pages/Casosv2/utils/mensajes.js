const normalize = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const safeDecode = (s) => {
  try {
    return decodeURIComponent((s ?? "").replace(/\+/g, " "));
  } catch {
    return s ?? "";
  }
};
const normalizarMensaje = (s) =>
  normalize(
    (s ?? "")
      .replace(/\s+/g, " ")
      .replace(/https?:\/\/\S+/g, "") // quitar URL para evitar falsas diferencias
      .trim()
  );

const extraerMapsUrl = (mensaje) => {
  const match = mensaje.match(/https?:\/\/maps\.google\.com\/[^\s]+/i);
  return match ? match[0] : null;
};
const extraerFechaHora = (mensaje) => {
  const match = mensaje.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : null;
};
const extraerVelocidad = (mensaje) => {
  const match = mensaje.match(/velocidad de\s+(\d+\s*km\/h)/i);
  return match ? match[1] : null;
};

const extraerLugar = (mensaje) => {
  const match = mensaje.match(/cerca de\s+'([^']+)'/i);
  return match ? match[1] : null;
};

export {
  normalize,
  safeDecode,
  normalizarMensaje,
  extraerMapsUrl,
  extraerFechaHora,
  extraerVelocidad,
  extraerLugar,
};
