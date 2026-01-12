import { normalize } from "./mensajes";

function obtenerUnitIdDesdeNombre(unidad) {
  if (!unidad) return;

  try {
    const raw = localStorage.getItem("wialon_units");
    if (!raw) return;

    const units = JSON.parse(raw);

    const found = units.find((u) => normalize(u.nm) === normalize(unidad));

    return found?.id;
  } catch {
    return;
  }
}

export { obtenerUnitIdDesdeNombre };