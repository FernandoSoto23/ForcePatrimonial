/* ============================================================
   PREGUNTAS OPERATIVAS CMS – PROTOCOLO II/PQTGSP/24
   MODELO FINAL DEFINITIVO
   - Texto orientado a ACCIONES (no preguntas)
   - Cada acción define su tipo de resultado
   - Compatible con bitácora, hora y auditoría
============================================================ */

export const PREGUNTAS_POR_PROTOCOLO = {
  /* ======================================================
     🔹 GENERALES – SIEMPRE APLICAN
     (OBSERVAR / VALIDAR / CONTACTAR)
  ====================================================== */
  GENERAL: [
    {
      key: "revisionCCTV",
      label: "Revisión de imágenes de cabina (CCTV)",
      tipoRespuesta: "boolean", // Sí / No
    },
    {
      key: "riesgoVisual",
      label: "Evaluación de indicios de riesgo en cabina",
      tipoRespuesta: "riesgo", // Sin riesgo / Riesgo
      dependsOn: "revisionCCTV",
      showIf: true,
    },
    {
      key: "contactoOperador",
      label: "Contacto telefónico con el operador",
      tipoRespuesta: "boolean",
    },
    {
      key: "operadorSinRiesgo",
      label: "Confirmación de tripulación sin riesgo",
      tipoRespuesta: "riesgo",
      dependsOn: "contactoOperador",
      showIf: true,
    },
  ],

  /* ======================================================
     🔹 SIN SEÑAL / JAMMER
     (RECUPERAR / LOCALIZAR / ESCALAR)
  ====================================================== */
  SIN_SENAL: [
    {
      key: "accionesRecuperacion",
      label: "Ejecución de acciones para recuperar señal GPS",
      tipoRespuesta: "boolean",
    },
    {
      key: "contactoDuranteSinSenal",
      label: "Intento de contacto con operador durante pérdida de señal",
      tipoRespuesta: "boolean",
    },
    {
      key: "ubicacionConfirmada",
      label: "Confirmación de ubicación y estatus de la unidad",
      tipoRespuesta: "boolean",
      dependsOn: "contactoDuranteSinSenal",
      showIf: true,
    },
    {
      key: "seguimientoSinSenal",
      label: "Seguimiento continuo hasta restablecimiento o escalamiento",
      tipoRespuesta: "boolean",
    },
    {
      key: "operativoAutoridades",
      label: "Solicitud de operativo con autoridades",
      tipoRespuesta: "boolean",
    },
  ],

  /* ======================================================
     🔹 UNIDAD DETENIDA
     (VALIDAR MOTIVO / TIEMPO / AUTORIZACIÓN)
  ====================================================== */
  UNIDAD_DETENIDA: [
    {
      key: "contactoDetencion",
      label: "Contacto con operador por detención de la unidad",
      tipoRespuesta: "boolean",
    },
    {
      key: "motivoParada",
      label: "Validación del motivo de la parada",
      tipoRespuesta: "boolean",
      dependsOn: "contactoDetencion",
      showIf: true,
    },
    {
      key: "motivoValido",
      label: "Evaluación del motivo conforme a protocolo",
      tipoRespuesta: "riesgo",
      dependsOn: "motivoParada",
      showIf: true,
    },
    {
      key: "tiempoReanudacion",
      label: "Confirmación de tiempo estimado para reanudar marcha",
      tipoRespuesta: "boolean",
      dependsOn: "motivoParada",
      showIf: true,
    },
    {
      key: "logisticaInformada",
      label: "Notificación a Torre de Control o Logística",
      tipoRespuesta: "boolean",
    },
  ],

  /* ======================================================
     🔹 DESVÍO DE RUTA
     (CONFIRMAR / AUTORIZAR / SEGUIR)
  ====================================================== */
  DESVIO_RUTA: [
    {
      key: "contactoDesvio",
      label: "Contacto con operador por desvío de ruta",
      tipoRespuesta: "boolean",
    },
    {
      key: "explicacionDesvio",
      label: "Recepción de explicación del desvío",
      tipoRespuesta: "boolean",
      dependsOn: "contactoDesvio",
      showIf: true,
    },
    {
      key: "autorizacionConfirmada",
      label: "Confirmación de autorización con Logística",
      tipoRespuesta: "boolean",
      dependsOn: "explicacionDesvio",
      showIf: true,
    },
    {
      key: "seguimientoDesvio",
      label: "Seguimiento hasta reincorporación a ruta asignada",
      tipoRespuesta: "boolean",
    },
  ],

  /* ======================================================
     🔹 SWITCH DE PÁNICO
     (ESCUCHAR / DETECTAR / ACTUAR)
  ====================================================== */
  SWITCH_PANICO: [
    {
      key: "escuchaEspia",
      label: "Escucha en modo espía (mínimo 60 segundos)",
      tipoRespuesta: "boolean",
    },
    {
      key: "indiciosAmenaza",
      label: "Identificación de amenazas o coacción",
      tipoRespuesta: "riesgo",
      dependsOn: "escuchaEspia",
      showIf: true,
    },
    {
      key: "llamadaPosterior",
      label: "Llamada posterior al operador conforme a protocolo",
      tipoRespuesta: "boolean",
    },
    {
      key: "protocoloActivado",
      label: "Activación del protocolo correspondiente",
      tipoRespuesta: "boolean",
    },
  ],

  /* ======================================================
     🔹 MOVIMIENTO SIN ASIGNACIÓN
     (VALIDAR / CONFIRMAR / DOCUMENTAR)
  ====================================================== */
  MOVIMIENTO_SIN_ASIGNAR: [
    {
      key: "validacionMovimiento",
      label: "Validación del movimiento con Torre de Control o Logística",
      tipoRespuesta: "boolean",
    },
    {
      key: "movimientoJustificado",
      label: "Confirmación del movimiento como justificado",
      tipoRespuesta: "boolean",
    },
    {
      key: "actualizacionBitacora",
      label: "Actualización de bitácora o formato de monitoreo",
      tipoRespuesta: "boolean",
    },
  ],

  /* ======================================================
     🔹 ESCALAMIENTO Y CIERRE
     (NOTIFICAR / CONTROLAR)
  ====================================================== */
  ESCALAMIENTO: [
    {
      key: "escalamientoAutoridades",
      label: "Escalamiento del evento a autoridades",
      tipoRespuesta: "boolean",
    },
    {
      key: "areasNotificadas",
      label: "Notificación a áreas correspondientes",
      tipoRespuesta: "boolean",
      dependsOn: "escalamientoAutoridades",
      showIf: true,
    },
    {
      key: "eventoControlado",
      label: "Confirmación de evento controlado",
      tipoRespuesta: "boolean",
    },
  ],
};

/* ============================================================
   GENERADOR DE PREGUNTAS SEGÚN CONTEXTO
   (EL SISTEMA DECIDE, NO EL MONITORISTA)
============================================================ */

export function generarPreguntas(contexto = {}) {
  let preguntas = [...PREGUNTAS_POR_PROTOCOLO.GENERAL];

  if (contexto.sinSenal) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.SIN_SENAL);
  }

  if (contexto.unidadDetenida) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.UNIDAD_DETENIDA);
  }

  if (contexto.desvioRuta) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.DESVIO_RUTA);
  }

  if (contexto.switchPanico) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.SWITCH_PANICO);
  }

  if (contexto.movimientoSinAsignar) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.MOVIMIENTO_SIN_ASIGNAR);
  }

  if (contexto.requiereEscalamiento) {
    preguntas.push(...PREGUNTAS_POR_PROTOCOLO.ESCALAMIENTO);
  }

  return preguntas;
}
