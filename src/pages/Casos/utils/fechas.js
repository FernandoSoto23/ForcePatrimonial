import { extraerFechaHora } from "./mensajes.js";

const formatearFechaHoraCritica = (ts) => {
  const d = new Date(ts);

  return {
    fecha: d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    hora: d.toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // ✅ AM / PM
    }),
  };
};


function obtenerBloqueHora(ts) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0); // inicio de la hora
  return d.getTime();
}


function buildTs(fecha, hora) {
  if (!fecha || !hora) return null;

  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm, ss] = hora.split(":").map(Number);

  // ⚠️ new Date(year, monthIndex, ...)
  // SIEMPRE crea fecha en horario local
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

const formatearFechaHora = (mensaje) => {
  const raw = extraerFechaHora(mensaje);
  if (!raw) return null;

  const [fecha, hora] = raw.split(" ");
  const [year, month, day] = fecha.split("-").map(Number);
  const [h, m, s] = hora.split(":").map(Number);

  const date = new Date(year, month - 1, day, h, m, s);

  const fechaFormateada = date.toLocaleDateString("es-MX");
  const horaFormateada = date.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    fecha: fechaFormateada,
    hora: horaFormateada,
  };
};
export {
  formatearFechaHoraCritica,
  obtenerBloqueHora,
  buildTs,
  formatearFechaHora,
};