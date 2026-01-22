export const PREGUNTAS_EVALUACION = [
  // 🧠 BLOQUE 1 — Contacto inicial
  {
    key: "contactoUnidad",
    label: "¿Se logró establecer comunicación con la unidad?",
  },
  {
    key: "sinRiesgoConfirmado",
    label: "¿La conversación indicó que la tripulación no se encontraba en riesgo?",
    dependsOn: "contactoUnidad",
    showIf: true,
  },

  // 📹 BLOQUE 2 — CCTV
  {
    key: "camarasRevisadas",
    label: "¿Se revisaron las últimas imágenes de cabina (CCTV)?",
  },
  {
    key: "anomaliaCamaras",
    label: "¿Las imágenes mostraron anomalías o presencia de personas ajenas?",
    dependsOn: "camarasRevisadas",
    showIf: true,
  },

  // 📡 BLOQUE 3 — Señal y tecnología
  {
    key: "gpsSinSenal",
    label: "¿La unidad presentó pérdida de señal GPS?",
  },
  {
    key: "switchPanico",
    label: "¿Se recibió activación de switch de pánico?",
  },

  // 🚨 BLOQUE 4 — Identificación de riesgo
  {
    key: "peligroDetectado",
    label: "¿Se detectó una situación de riesgo?",
  },
  {
    key: "personasSospechosas",
    label: "¿Se detectó presencia de personas o vehículos sospechosos?",
    dependsOn: "peligroDetectado",
    showIf: true,
  },
  {
    key: "amenazasDetectadas",
    label: "¿Se identificaron amenazas o indicios de agresión a la tripulación?",
    dependsOn: "peligroDetectado",
    showIf: true,
  },

  // 🛑 BLOQUE 5 — Detención
  {
    key: "unidadDetenida",
    label: "¿La unidad se encontraba detenida?",
  },
  {
    key: "detencionAutorizada",
    label: "¿La detención estaba autorizada por logística?",
    dependsOn: "unidadDetenida",
    showIf: true,
  },

  // 🧭 BLOQUE 6 — Ruta y movimientos
  {
    key: "rutaCorrecta",
    label: "¿La unidad circulaba conforme a la ruta programada?",
  },
  {
    key: "movimientoSinAsignar",
    label: "¿Se detectó movimiento de la unidad sin asignación?",
  },

  // 📣 BLOQUE 7 — Escalamiento y cierre
  {
    key: "requiereEscalamiento",
    label: "¿Fue necesario escalar el evento a autoridades u otro protocolo?",
  },
  {
    key: "areaNotificada",
    label: "¿Se notificó al área correspondiente (Torre de Control / Logística)?",
    dependsOn: "requiereEscalamiento",
    showIf: true,
  },
  {
    key: "eventoControlado",
    label: "¿El operador confirmó que la situación fue controlada?",
  },
];
