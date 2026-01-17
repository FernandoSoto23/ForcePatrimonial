// casos-v2/parseAlerta.js

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function parseUnidad(texto) {
  const t = normalize(texto);

  const patrones = [
    /\b[A-Z]{2,4}\d{2}\sM-\d{3,5}\b/, // MEX01 M-2669
    /\b[A-Z]{2,4}\sM-\d{3,5}\b/,     // TIJ M-2274
    /\bPXGL\sPX\d{5}\b/,             // PXGL PX00136
    /\bITM\sM\d{6}\b/,               // ITM M003521
  ];

  for (const p of patrones) {
    const m = t.match(p);
    if (m) return m[0];
  }

  return "SIN DATOS";
}

export function parseTipo(texto) {
  const t = normalize(texto);
  console.log(texto)
  if (t.includes("PANICO")) return "PANICO";
  if (t.includes("JAMMER")){
      console.log("Hay una alerta de jammer")
     return "DETECCION DE JAMMER"
  }
  if (t.includes("SIN SENAL")) return "SIN SEÑAL";
  if (t.includes("UNIDAD DETENIDA")) return "UNIDAD DETENIDA";
  if (t.includes("ZONA")) return "ZONA DE RIESGO";
  if (t.includes("HORA DE NOTIFICACION")) return "INFORMATIVA";

  return "INFORMATIVA";
}
