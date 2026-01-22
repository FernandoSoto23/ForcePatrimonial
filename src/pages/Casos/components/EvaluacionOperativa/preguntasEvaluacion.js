export const PREGUNTAS_EVALUACION = [
  {
    key: "contactoUnidad",
    label: "¿Se logró contactar con la unidad?",
  },
  {
    key: "sinRiesgoConfirmado",
    label: "¿El operador confirmó que no hay riesgo inmediato?",
    dependsOn: "contactoUnidad",
    showIf: true,
  },
  {
    key: "camarasRevisadas",
    label: "¿Se revisaron las cámaras?",
    dependsOn: "contactoUnidad",
    showIf: true,
  },
  {
    key: "anomaliaCamaras",
    label: "¿Las cámaras mostraron alguna anomalía?",
    dependsOn: "camarasRevisadas",
    showIf: true,
  },
  {
    key: "peligroDetectado",
    label: "¿Se detectó algún peligro o situación de riesgo?",
  },
  {
    key: "personasSospechosas",
    label: "¿Se observó presencia de personas sospechosas?",
    dependsOn: "peligroDetectado",
    showIf: true,
  },
  {
    key: "seguimientoUnidad",
    label: "¿Se detectó intento de seguimiento o bloqueo?",
    dependsOn: "peligroDetectado",
    showIf: true,
  },
  {
    key: "unidadDetenida",
    label: "¿La unidad se encontraba detenida?",
  },
  {
    key: "detencionAutorizada",
    label: "¿La detención fue autorizada?",
    dependsOn: "unidadDetenida",
    showIf: true,
  },
  {
    key: "rutaCorrecta",
    label: "¿La unidad circulaba por la ruta programada?",
  },
  {
    key: "eventoControlado",
    label: "¿El operador confirmó que la situación fue controlada?",
  },
  {
    key: "requiereEscalamiento",
    label: "¿Fue necesario escalar el evento a otro protocolo?",
  },
  {
    key: "areaNotificada",
    label: "¿Se notificó al área correspondiente?",
    dependsOn: "requiereEscalamiento",
    showIf: true,
  },
];
