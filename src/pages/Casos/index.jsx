import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useReducer,
} from "react";
import { getCodigoAgente, setCodigoAgente } from "../../utils/codigoAgente";
import Select from "react-select";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useUnits } from "../../context/UnitsContext";
import { generarPreguntas } from "./components/EvaluacionOperativa/preguntasEvaluacion";
import Swal from "sweetalert2";
import MapaUnidadLive from "./components/MapaUnidadLive";
import ModalLlamadaCabina from "./components/ModalLlamada";
import EvaluacionOperativa from "./components/EvaluacionOperativa/EvaluacionOperativa";
import { tsCaso, esPanico } from "./utils/casos";
import CasoActivoCard from "./components/CasoActivoCard";
import CasoCriticoCard from "./components/CasoCriticoCard";
import { PhoneIcon } from "@heroicons/react/24/solid";
import {
  normalize,
  safeDecode,
  normalizarMensaje,
  extraerMapsUrl,
  extraerFechaHora,
  extraerVelocidad,
  extraerLugar,
} from "./utils/mensajes";
import {
  formatearFechaHoraCritica,
  obtenerBloqueHora,
  buildTs,
  formatearFechaHora,
} from "./utils/fechas";
import { extraerLatLng, extraerZonas } from "./utils/geocercas";
import MensajeExpandable from "./components/MensajeExpandible";
import { jwtDecode } from "jwt-decode";
import ResumenCargaAlertas from "./components/ResumenCargaAlertas";
import BarraOperativa from "./components/BarraOperativa";
/* ============================================================
    CONFIG   VARIABLES GLOBALES
  ============================================================ */

const TWILIO_BACKEND = "http://localhost:4000";

const API_URL = "https://apipx.onrender.com" || "http://localhost:4000";
const SOCKET_URL = "https://apipx.onrender.com";

const MOTIVOS_CIERRE = [
  { value: "Descanso", label: "Descanso" },
  { value: "Alimentos", label: "Alimentos" },
  { value: "W.C.", label: "W.C." },
  { value: "Accidente Externo", label: "Accidente Externo" },
  { value: "Carga de Combustible", label: "Carga de Combustible" },
  {
    value: "Resguardo por Restriccion de Horario",
    label: "Resguardo por Restriccion de Horario",
  },
  { value: "Pension", label: "Pension" },
  { value: "Revision de Equipo", label: "Revision de Equipo" },
  { value: "En espera de indicaciones", label: "En espera de indicaciones" },
  { value: "Parada en Ruta", label: "Parada en Ruta" },
  { value: "Llanta ponchada", label: "Llanta ponchada" },
  { value: "Falla accesorios", label: "Falla accesorios" },
  { value: "Revision por autoridades", label: "Revision por autoridades" },
  { value: "Baja cobertura", label: "Baja cobertura" },
  { value: "Apoyo a Compañero", label: "Apoyo a Compañero" },
  { value: "Falla-mecanica", label: "Falla-mecanica" },
  { value: "Salida de Sucursal", label: "Salida de Sucursal" },
  { value: "Llanta Tronada", label: "Llanta Tronada" },
  { value: "Desvio de Ruta Autorizado", label: "Desvio de Ruta Autorizado" },
  {
    value: "Desvio de ruta no autorizado",
    label: "Desvio de ruta no autorizado",
  },
  { value: "Omision de protocolo", label: "Omision de protocolo" },
  {
    value: "Llegada a punto de custodia PBC",
    label: "Llegada a punto de custodia PBC",
  },
  { value: "Reparacion de Carretera", label: "Reparacion de Carretera" },
  { value: "Detencion por Autoridades", label: "Detencion por Autoridades" },
  { value: "Avance Lento", label: "Avance Lento" },
  { value: "Mal Clima", label: "Mal Clima" },
  {
    value: "Siniestro Vial Sin Lesionados",
    label: "Siniestro Vial Sin Lesionados",
  },
  { value: "Manifestantes", label: "Manifestantes" },
  { value: "Talacha", label: "Talacha" },
  { value: "Sin señal", label: "Sin señal" },
  { value: "Falla de accesorios", label: "Falla de accesorios" },
  { value: "Falla mecanica", label: "Falla mecanica" },
  { value: "Bloqueo de camino", label: "Bloqueo de camino" },
  { value: "Falla-electrica", label: "Falla-electrica" },
  { value: "Enfermedad", label: "Enfermedad" },
  { value: "Accidente laboral", label: "Accidente laboral" },
  { value: "Agencia", label: "Agencia" },
  {
    value: "Agresion directa con lesionados",
    label: "Agresion directa con lesionados",
  },
  {
    value: "Agresion directa sin lesionados",
    label: "Agresion directa sin lesionados",
  },
  { value: "Ambos equipos", label: "Ambos equipos" },
  {
    value: "Asalto con afectacion a mercancia",
    label: "Asalto con afectacion a mercancia",
  },
  { value: "Asalto con violencia", label: "Asalto con violencia" },
  {
    value: "Asalto sin afectacion a mercancia",
    label: "Asalto sin afectacion a mercancia",
  },
  {
    value: "Cambio de operador al volante",
    label: "Cambio de operador al volante",
  },
  { value: "Corralon", label: "Corralon" },
  { value: "Daño por vandalismo", label: "Daño por vandalismo" },
  { value: "Decomiso por autoridades", label: "Decomiso por autoridades" },
  {
    value: "Decomiso por mercancia contaminada",
    label: "Decomiso por mercancia contaminada",
  },
  { value: "Detencion ambos equipos", label: "Detencion ambos equipos" },
  { value: "Detencion de remolques", label: "Detencion de remolques" },
  { value: "Detencion de tractocamion", label: "Detencion de tractocamion" },
  { value: "Detencion de tripulacion", label: "Detencion de tripulacion" },
  { value: "Ead", label: "Ead" },
  { value: "En rutas logisticas", label: "En rutas logisticas" },
  { value: "Enlace", label: "Enlace" },
  { value: "Equipo dañado", label: "Equipo dañado" },
  { value: "Exceso de velocidad", label: "Exceso de velocidad" },
  { value: "Falla de tarjeta iave", label: "Falla de tarjeta iave" },
  { value: "Falso operativo", label: "Falso operativo" },
  { value: "Falta de diesel", label: "Falta de diesel" },
  { value: "Faltante de llanta", label: "Faltante de llanta" },
  { value: "Hotel", label: "Hotel" },
  { value: "Intento de asalto", label: "Intento de asalto" },
  { value: "Jammer detectado", label: "Jammer detectado" },
  { value: "Lavado", label: "Lavado" },
  { value: "Revision de documentos", label: "Revision de documentos" },
  { value: "Llamada de extorcion", label: "Llamada de extorcion" },
  {
    value: "Llegada a punto de custodia CRB",
    label: "Llegada a punto de custodia CRB",
  },
  { value: "Llegada a sucursal", label: "Llegada a sucursal" },
  { value: "Maniobras", label: "Maniobras" },
  { value: "Operativo en proceso", label: "Operativo en proceso" },
  { value: "Persecucion", label: "Persecucion" },
  { value: "Persona sospechosa", label: "Persona sospechosa" },
  { value: "Prueba de manejo", label: "Prueba de manejo" },
  { value: "Pruebas", label: "Pruebas" },
  { value: "Queclink", label: "Queclink" },
  { value: "Rad", label: "Rad" },
  { value: "Retencion de mercancia", label: "Retencion de mercancia" },
  {
    value: "Robo con afectacion a mercancia",
    label: "Robo con afectacion a mercancia",
  },
  { value: "Robo de accesorios", label: "Robo de accesorios" },
  { value: "Robo de unidad", label: "Robo de unidad" },
  {
    value: "Robo sin afectacion a mercancia",
    label: "Robo sin afectacion a mercancia",
  },
  { value: "Robo sin violencia", label: "Robo sin violencia" },
  { value: "Robo total", label: "Robo total" },
  { value: "Ruptela", label: "Ruptela" },
  { value: "Ruta confirmada", label: "Ruta confirmada" },
  { value: "Sin candados", label: "Sin candados" },
  { value: "Sin celular", label: "Sin celular" },
  {
    value: "Siniestro vial con afectacion de mercancia",
    label: "Siniestro vial con afectacion de mercancia",
  },
  {
    value: "Siniestro vial con defunciones",
    label: "Siniestro vial con defunciones",
  },
  {
    value: "Siniestro vial con lesionados",
    label: "Siniestro vial con lesionados",
  },
  {
    value: "Siniestro vial con mercancia expuesta",
    label: "Siniestro vial con mercancia expuesta",
  },
  {
    value: "Siniestro vial sin afectacion de mercancia",
    label: "Siniestro vial sin afectacion de mercancia",
  },
  {
    value: "Siniestro vial sin mercancia expuesta",
    label: "Siniestro vial sin mercancia expuesta",
  },
  { value: "Taller", label: "Taller" },
  { value: "Traslado", label: "Traslado" },
  { value: "Vehiculo sospechoso", label: "Vehiculo sospechoso" },
];

const MOTIVOS_CIERRE_ALERTA = [
  {
    value: "FALSA_ALARMA",
    label: "Falsa alarma",
    body: "Se valida la alerta y se confirma que corresponde a una falsa alarma.",
  },
  {
    value: "EVENTO_ATENDIDO",
    label: "Evento atendido sin novedad",
    body: "Se realiza monitoreo y contacto, sin detectar riesgo para la unidad.",
  },
  {
    value: "CONTACTO_OPERADOR",
    label: "Contacto con operador / chofer",
    body: "Se establece comunicación con el operador y se confirma operación normal.",
  },
  {
    value: "PROBLEMA_TECNICO",
    label: "Problema técnico",
    body: "La alerta se genera por falla técnica del dispositivo.",
  },
  {
    value: "OTRO",
    label: "Otro (requiere observación)",
    body: "",
  },
];

function casosReducer(state, action) {
  switch (action.type) {
    case "ADD_ALERTA": {
      const { casoId, payload } = action;
      const copia = { ...state };

      let actual = copia[casoId];

      // 🟢 CASO NUEVO
      if (!actual) {
        actual = payload.base;
      } else {
        const nuevoEvento = payload.base.eventos[0];

        // 🛑 DEDUPLICACIÓN
        if (actual.eventos.some((e) => e.id === nuevoEvento.id)) {
          return state;
        }

        actual.eventos.push(nuevoEvento);

        const t = nuevoEvento.tipoNorm;
        actual.repeticiones[t] = (actual.repeticiones[t] || 0) + 1;
      }

      /* ===============================
         🔥 LÓGICA REAL DE CRÍTICOS
      =============================== */

      // ❌ IGNORAR TODO LO QUE ESTÉ EN S
      const eventosNoS = actual.eventos.filter((e) => e.geocercaSLTA !== "S");

      const totalNoS = eventosNoS.length;

      // ✅ SOLO ESTO DEFINE CRÍTICO
      actual.critico = totalNoS >= 2;

      // UI
      actual.combinacion = Object.keys(actual.repeticiones)
        .sort((a, b) => actual.repeticiones[b] - actual.repeticiones[a])
        .join(" + ");

      copia[casoId] = actual;
      return copia;
    }

    case "REMOVE": {
      const out = { ...state };
      delete out[action.casoId];
      return out;
    }

    case "TOGGLE":
      return {
        ...state,
        [action.caso.id]: {
          ...action.caso,
          expanded: !action.caso.expanded,
        },
      };

    case "RESET":
      return {};
    default:
      return state;
  }
}

export default function Casos() {
  /* VARIABLES DE ESTADO */
  /* USE STATE */
  const [busquedaMotivo, setBusquedaMotivo] = useState("");
  const [filtroTipoAlerta, setFiltroTipoAlerta] = useState("TODOS");
  const [casos, dispatchCasos] = useReducer(casosReducer, {});
  const sirena = useRef(null);
  const [evaluacionCritica, setEvaluacionCritica] = useState({});
  const [showMsg, setShowMsg] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [casoCriticoSeleccionado, setCasoCriticoSeleccionado] = useState(null);
  const [detalleCierre, setDetalleCierre] = useState("");
  const [motivoCierre, setMotivoCierre] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [idCriticoFijo, setIdCriticoFijo] = useState(null);
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const refPanel = useRef(null);
  const [usuario, setUsuario] = useState(null);
  const [mapaUnidad, setMapaUnidad] = useState(null);
  const [totalAlertas, setTotalAlertas] = useState(0);
  const [alertasFiltradas, setAlertasFiltradas] = useState(0);
  const [alertasProcesadas, setAlertasProcesadas] = useState(0);
  const [cargaTerminada, setCargaTerminada] = useState(false);
  const [conversacionIA, setConversacionIA] = useState([]);
  const [protocolosEjecutados, setProtocolosEjecutados] = useState({
    asalto: false,
    panico: false,
    desvio: false,
    enfermedad: false,
    inseguridad: false,
    detenida: false,
    sinSenal: false,
  });

  const [modalLlamadaAbierto, setModalLlamadaAbierto] = useState(false);
  const [eventoLlamada, setEventoLlamada] = useState(null);

  /* USE REF */
  const idsRecibidosRef = useRef([]);
  const llamadaActivaRef = useRef(null);
  const twilioDeviceRef = useRef(null);
  const unidadesUsuarioRef = useRef(new Set());
  const unidadValidaCacheRef = useRef(new Map());
  const unidadesMapRef = useRef(new Map());
  const bufferRef = useRef([]);
  const { units, loading: loadingUnits } = useUnits();
  const criticosRefs = useRef({});
  const alertasProcesadasRef = useRef(new Set());

  /* USE MEMO */
  const lista = useMemo(() => {
    return Object.values(casos)
      .filter((c) => Array.isArray(c.eventos))
      .sort((a, b) => tsCaso(b) - tsCaso(a));
  }, [casos]);

  const activos = useMemo(() => {
    return lista.filter((c) => {
      // ❌ si es crítico no va aquí
      if (c.critico) return false;

      const ultimoEvento = c.eventos?.[0];
      if (!ultimoEvento) return false;

      const tipo = (ultimoEvento.tipoNorm || "").toUpperCase();

      const nombreUsuario = usuario?.name?.toUpperCase().trim();

      // 🚫 siempre ocultar ZONA DE RIESGO
      if (tipo === "ZONA DE RIESGO") return false;

      // 🚫 reglas especiales para usuarios TDC
      if (
        (nombreUsuario === "TDCPRUEBAS" || nombreUsuario?.startsWith("TDC")) &&
        (tipo === "SIN SENAL" || tipo === "UNIDAD DETENIDA AUTORIZADA")
      ) {
        return false;
      }
      /* if (tipo === "UNIDAD DETENIDA AUTORIZADA") return false; */
      return true;
    });
  }, [lista]);

  const criticos = useMemo(() => lista.filter((c) => c.critico), [lista]);
  const detalleCierreFinal = useMemo(() => {
    if (!motivoCierre) return "";
    return `
  Motivo: ${motivoCierre}
  ${observacionesCierre ? `Observaciones: ${observacionesCierre}` : ""}
  `.trim();
  }, [motivoCierre, observacionesCierre]);
  const conteoPorTipo = useMemo(() => {
    if (!casoCriticoSeleccionado) return {};

    return casoCriticoSeleccionado.eventos.reduce((acc, e) => {
      const k = e.tipoNorm || normalize(e.tipo);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  }, [casoCriticoSeleccionado]);

  const contextoEvento = useMemo(
    () => ({
      sinSenal: (conteoPorTipo["SIN SENAL"] || 0) > 0,
      switchPanico: (conteoPorTipo["PANICO"] || 0) > 0,
      desvioRuta: (conteoPorTipo["DESVIO DE RUTA"] || 0) > 0,
    }),
    [conteoPorTipo],
  );
  const motivosFiltrados = useMemo(() => {
    const q = busquedaMotivo.trim().toLowerCase();

    if (!q) return MOTIVOS_CIERRE;

    return MOTIVOS_CIERRE.filter((m) => m.label.toLowerCase().includes(q));
  }, [busquedaMotivo]);
  const tiposDisponibles = Object.keys(conteoPorTipo);

  /* FUNCIONES */

  const conectarTwilio = useCallback(async () => {
    if (twilioDeviceRef.current) return;

    try {
      const res = await fetch(`${TWILIO_BACKEND}/conmutador/token`);
      const { token } = await res.json();

      const device = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        enableRingingState: true,
      });

      device.on("registered", () => {
        console.log("🎧 Twilio WebRTC conectado");
      });

      device.on("incoming", (call) => {
        console.log("📞 Llamada entrante (humana)");
        call.accept(); // 👈 AQUÍ HABLAS DESDE LA PC
      });

      device.on("error", (err) => {
        console.error("Twilio error", err);
      });

      await device.register();
      twilioDeviceRef.current = device;
    } catch (e) {
      console.error("Error conectando Twilio", e);
    }
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (!casoCriticoSeleccionado) return [];

    if (filtroTipoAlerta === "TODOS") {
      return casoCriticoSeleccionado.eventos;
    }

    return casoCriticoSeleccionado.eventos.filter(
      (e) => (e.tipoNorm || normalize(e.tipo)) === filtroTipoAlerta,
    );
  }, [casoCriticoSeleccionado, filtroTipoAlerta]);

  function procesarEnLotes(
    items,
    procesar,
    batchSize = 200,
    onProgress,
    onFinish,
  ) {
    let index = 0;

    function nextBatch() {
      const end = Math.min(index + batchSize, items.length);

      for (let i = index; i < end; i++) {
        procesar(items[i]);
      }

      index = end;

      // callback progreso (si existe)
      if (onProgress) {
        onProgress(index, items.length);
      }

      if (index < items.length) {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(nextBatch);
        } else {
          setTimeout(nextBatch, 0);
        }
      } else {
        // callback final (si existe)
        if (onFinish) {
          onFinish();
        }
      }
    }

    nextBatch();
  }
  const marcarProtocolo = (key) => {
    setProtocolosEjecutados((prev) => ({
      ...prev,
      [key]: true,
    }));
  };
  function unidadPerteneceAlUsuario(unidad) {
    if (!unidad) return false;

    const key = normalize(unidad);

    // 🚀 cache inmediato
    if (unidadValidaCacheRef.current.has(key)) {
      return unidadValidaCacheRef.current.get(key);
    }
    const pertenece = unidadesUsuarioRef.current.has(key);
    unidadValidaCacheRef.current.set(key, pertenece);

    return pertenece;
  }
  const preguntasActuales = useMemo(
    () => generarPreguntas(contextoEvento),
    [contextoEvento],
  );

  const esUsuarioTDC = useMemo(() => {
    if (!usuario?.name) return false;

    const nombre = usuario.name.toUpperCase().trim();

    return nombre === "TDCPRUEBAS" || nombre.startsWith("TDC");
  }, [usuario]);

  const evaluacionTexto = preguntasActuales
    .map((p) => {
      const r = evaluacionCritica[p.key];
      if (!r) return null;
      return `- ${p.label}: ${r.respuesta ? "Sí" : "No"}`;
    })
    .filter(Boolean)
    .join("\n");

  const TIPOS_CORRELACIONABLES = new Set([
    "PANICO",
    "DESVIO DE RUTA",
    "UNIDAD DETENIDA",
    "SIN SENAL",
    "DETECCION DE JAMMER",
  ]);

  const VENTANA_CORRELACION = 5 * 60 * 1000;
  const procesarAlerta = (data) => {
    // ===============================
    // 1️⃣ VALIDACIONES BÁSICAS
    // ===============================
    if (!data) return;

    // 🛑 DEDUP GLOBAL POR ID
    if (data.id && alertasProcesadasRef.current.has(data.id)) {
      return;
    }

    if (data.id) {
      alertasProcesadasRef.current.add(data.id);
    }
    // 🚫 NO procesar si unidades aún no están cargadas
    if (unidadesUsuarioRef.current.size === 0) {
      return;
    }
    const mensaje = safeDecode(data.mensaje || "");
    const unidadRaw = (data.unidad || "").trim();
    const tipoRaw = (data.tipo || "").trim();

    if (!mensaje || !unidadRaw || !tipoRaw) return;

    const unidadKey = normalize(unidadRaw);
    const tipoNorm = normalize(tipoRaw);

    // 🔐 RESTRICCIÓN PARA USUARIOS TDC
    if (!puedeVerAlerta(tipoRaw)) {
      return;
    }

    // 🔐 validar que la unidad sea del usuario
    if (!unidadesUsuarioRef.current.has(unidadKey)) return;

    const unitId = unidadesMapRef.current.get(unidadKey);
    if (!unitId) return;

    // ===============================
    // 2️⃣ TIMESTAMP DEL EVENTO
    // ===============================
    let tsInc = Date.now();

    const fh = extraerFechaHora(mensaje);
    if (fh) {
      const [fecha, hora] = fh.split(" ");
      const parsed = buildTs(fecha, hora);
      if (parsed) tsInc = parsed;
    }

    const tsRx = Date.now();

    // ===============================
    // 3️⃣ GEOCAERCA
    // ===============================
    const geocerca = data.geocerca_slta ?? null;
    const enSucursal = geocerca === "S";

    // ===============================
    // 4️⃣ DEFINIR SI CORRELACIONA
    // ===============================
    const esCorrelacionable =
      TIPOS_CORRELACIONABLES.has(tipoNorm) && !enSucursal;

    // ===============================
    // 5️⃣ CASO ID (CLAVE)
    // ===============================
    let casoId;

    if (esCorrelacionable) {
      // 🔥 BLOQUE DE TIEMPO CONTROLADO
      const bloque = Math.floor(tsInc / VENTANA_CORRELACION);
      casoId = `${unidadKey}_${bloque}`;
    } else {
      // 🟢 alerta normal, nunca se agrupa
      casoId = `${data.id}`;
    }

    // ===============================
    // 6️⃣ DISPATCH AL REDUCER
    // ===============================
    const alertaId = data.id != null ? String(data.id) : null;
    console.log("🔔 Alerta recibida:", {
      alertaId,
      unidad: unidadRaw,
      tipo: tipoRaw,
      mensaje,
    });
    if (!alertaId) return;

    // 🔎 verificar si ya existe
    if (idsRecibidosRef.current.includes(alertaId)) {
      console.log("🚨 ALERTA DUPLICADA DETECTADA:", alertaId);
    } else {
      idsRecibidosRef.current.push(alertaId);
      console.log("✅ Nueva alerta guardada:", alertaId);
    }

    dispatchCasos({
      type: "ADD_ALERTA",
      casoId,
      payload: {
        base: {
          id: casoId,
          unidad: unidadRaw,
          unitId,
          eventos: [
            {
              id: data.id,
              tipo: tipoRaw,
              unidad: unidadRaw,
              tipoNorm,
              mensaje,
              tsRx,
              tsInc,
              fechaHoraFmt: formatearFechaHora(mensaje),
              lugar: extraerLugar(mensaje),
              velocidad: extraerVelocidad(mensaje),
              mapsUrl: extraerMapsUrl(mensaje),
              geocercaSLTA: geocerca,
              geocercas_json: data.geocercas_json ?? null,
            },
          ],
          repeticiones: { [tipoNorm]: 1 },
          expanded: false,
          estado: "NUEVO",
          zonas: extraerZonas(data.geocercas_json),
        },
      },
    });
  };

  const resumenReps = (reps) => {
    const entries = Object.entries(reps || {});
    if (entries.length === 0) return "—";

    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t} (${n})`)
      .join(" • ");
  };
  const resetearProtocolos = () => {
    setProtocolosEjecutados({
      asalto: false,
      panico: false,
      desvio: false,
      enfermedad: false,
      inseguridad: false,
      detenida: false,
      sinSenal: false,
    });
  };
  const hayAlMenosUnProtocoloEjecutado = () => {
    return Object.values(protocolosEjecutados).some(Boolean);
  };
  const resetUIAfterClose = () => {
    // 🔹 modales
    setCasoSeleccionado(null);
    setCasoCriticoSeleccionado(null);
    setMapaUnidad(null);

    // 🔹 cierres
    setDetalleCierre("");
    setMotivoCierre("");
    setObservacionesCierre("");

    // 🔹 evaluaciones
    setEvaluacionCritica({});

    // 🔹 protocolos
    resetearProtocolos();

    // 🔹 anclas
    setIdCriticoFijo(null);
  };

  function cerrarModalYEliminarCaso(casoId) {
    // 🧹 limpiar UI completa
    resetUIAfterClose();

    // 🗑 eliminar caso del reducer
    dispatchCasos({
      type: "REMOVE",
      casoId: String(casoId),
    });
  }

  const toggleCaso = useCallback((caso) => {
    dispatchCasos({ type: "TOGGLE", caso });
  }, []);

  const analizarCaso = useCallback((caso) => {
    setCasoSeleccionado(caso);
  }, []);

  const verMapa = useCallback((caso) => {
    setMapaUnidad({
      unitId: caso.unitId,
      unidad: caso.unidad,
      alerta: caso.eventos[0],
    });
  }, []);
  const llamarCabina = useCallback(
    (evento) => {
      if (modalLlamadaAbierto) return;

      setEventoLlamada(evento);
      setModalLlamadaAbierto(true);
      llamadaActivaRef.current = true;
    },
    [modalLlamadaAbierto],
  );

  const llamarOperadorCb = useCallback(async (evento, opciones = {}) => {
    try {
      // 👤 LLAMADA HUMANA (NUEVA, NO AFECTA AL BOT)
      if (opciones.modo === "humano") {
        await fetch("http://localhost:4000/conmutador/llamar-operador", {
          method: "POST",
        });
        return; // ⬅️ importante: aquí se detiene
      }

      // 🤖 LLAMADA BOT (LA QUE YA TENÍAS, INTACTA)
      await fetch("https://apipx.onrender.com/iaVoice/llamar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: "+526681515406",
          contexto: evento,
        }),
      });
    } catch (e) {
      toast.error("No se pudo realizar la llamada");
    }
  }, []);

  const contarPanicos = (caso) => {
    return (caso.eventos || []).filter(
      (e) => (e.tipoNorm || normalize(e.tipo)) === "PANICO",
    ).length;
  };

  useEffect(() => {
    conectarTwilio();
  }, [conectarTwilio]);

  useEffect(() => {
    const codigoGuardado = getCodigoAgente();

    if (codigoGuardado) {
      setCodigoInput(codigoGuardado);
    }
  }, []);

  useEffect(() => {
    if (!idCriticoFijo) return;

    const el = criticosRefs.current[idCriticoFijo];
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [idCriticoFijo]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      console.log("USUARIO:", decoded);
      // ejemplo: decoded.usuario o decoded.user
      console.log(decoded);
      setUsuario(decoded);
    } catch (error) {
      console.error("Token inválido", error);
    }
  }, []);
  useEffect(() => {
    if (casoCriticoSeleccionado) {
      setFiltroTipoAlerta("TODOS");
    }
  }, [casoCriticoSeleccionado]);
  useEffect(() => {
    if (loadingUnits) return;
    if (!Array.isArray(units) || units.length === 0) return;

    const set = new Set();
    const map = new Map();

    units.forEach((u) => {
      if (!u?.unidad || !u?.id) return;

      const key = normalize(u.unidad);
      set.add(key);
      map.set(key, u.id);
    });

    unidadesUsuarioRef.current = set;
    unidadesMapRef.current = map;

    console.log("🔐 Unidades cargadas desde Context:", set.size);
    console.log("🗺 Mapa unidad → id:", map.size);
  }, [units, loadingUnits]);

  const puedeVerAlerta = useCallback(
    (tipoRaw) => {
      const tipoNorm = normalize(tipoRaw || "");

      if (esUsuarioTDC) {
        return tipoNorm === "BOTON DE AYUDA";
      }

      return tipoNorm !== "BOTON DE AYUDA";
    },
    [esUsuarioTDC],
  );

  useEffect(() => {
    if (loadingUnits) return;
    if (unidadesUsuarioRef.current.size === 0) return;
    let cancel = false;

    const cargarAlertas = async () => {
      try {
        const unitNames = units.map((u) => u.unidad); // nombres
        const resp = await fetch(`${API_URL}/alertas/alertas-activas-unidad`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unidades: unitNames,
          }),
        });
        const data = await resp.json();
        if (cancel) return;
        const todas = data ?? [];
        // 🔐 filtrar por unidades del usuario
        const filtradas = todas.filter((a) => puedeVerAlerta(a.tipo));

        setAlertasFiltradas(filtradas.length);
        setAlertasProcesadas(0);
        setCargaTerminada(false);

        // ⚙️ procesar en lotes
        procesarEnLotes(
          filtradas,
          (a) => {
            procesarAlerta({
              id: a.id,
              mensaje: a.mensaje,
              unidad: a.unidad,
              tipo: a.tipo,
              geocerca_slta: a.geocerca_slta,
              fecha_incidente: a.fecha_incidente,
              hora_incidente: a.hora_incidente,
              geocercas_json: a.geocercas_json,
            });
          },
          200,
          (procesadas) => {
            setAlertasProcesadas(procesadas);
          },
          () => {
            setCargaTerminada(true);
            console.log("✅ Carga inicial COMPLETA");
          },
        );
      } catch (e) {
        console.error("❌ Error cargando alertas:", e);
      }
    };

    cargarAlertas();

    return () => {
      cancel = true;
    };
  }, [loadingUnits, units, usuario, esUsuarioTDC]);
  useEffect(() => {
    const flush = () => {
      if (bufferRef.current.length === 0) return;

      // 🔥 procesar todas juntas
      bufferRef.current.forEach((alerta) => {
        procesarAlerta(alerta);
      });

      bufferRef.current = [];
    };

    const interval = setInterval(flush, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!usuario) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    console.log("✅ SOCKET CONECTADO");

    socket.on("nueva_alerta", (a) => {
      if (unidadesUsuarioRef.current.size === 0) {
        console.log("⏳ unidades aún no cargadas");
        return;
      }

      const unidadRaw = (a.unitName ?? a.unidad ?? "").trim();
      const unidadKey = normalize(unidadRaw);

      const tipoRaw = (a.alertType ?? a.tipo ?? "").trim();

      // 🔐 regla de visibilidad global
      if (!puedeVerAlerta(tipoRaw)) {
        console.log("🚫 Bloqueada por regla TDC:", tipoRaw);
        return;
      }
      if (!unidadKey) return;

      if (!unidadesUsuarioRef.current.has(unidadKey)) {
        console.log("🚫 Unidad no pertenece al usuario:", unidadRaw);
        return;
      }

      bufferRef.current.push({
        id: a.id ?? a.alertaId ?? a.id_alerta,
        mensaje: a.message ?? a.mensaje ?? "",
        unidad: unidadRaw,
        tipo: tipoRaw,
        geocerca_slta: a.geocerca_slta ?? null,
        geocercas_json: a.geocercas_json ?? null,
      });
    });

    return () => {
      console.log("❌ SOCKET DESCONECTADO");
      socket.disconnect();
    };
  }, [usuario, esUsuarioTDC]);

  useEffect(() => {
    if (casoCriticoSeleccionado || casoSeleccionado || mapaUnidad) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [casoCriticoSeleccionado, casoSeleccionado, mapaUnidad]);
  const refrescarAlertas = async () => {
    dispatchCasos({ type: "RESET" }); // si quieres limpiar todo (opcional)

    const resp = await fetch(`${API_URL}/alertas/activas`);
    const data = await resp.json();

    const todas = data ?? [];

    const filtradas = todas.filter((a) => unidadPerteneceAlUsuario(a.unidad));

    filtradas.forEach((a) => {
      procesarAlerta({
        id: a.id,
        mensaje: a.mensaje,
        unidad: a.unidad,
        tipo: a.tipo,
        geocerca_slta: a.geocerca_slta,
        geocercas_json: a.geocercas_json,
      });
    });
  };

  return (
    <div>
      <BarraOperativa
        total={lista.length}
        activos={activos.length}
        criticos={criticos.length}
        onCrearAlerta={() => {
          console.log("🚨 Crear alerta manual");
          // aquí tú metes la lógica real
        }}
        onRefrescarAlertas={() => window.location.reload()}
      />
      <button
        onClick={() => setMostrarCodigo((v) => !v)}
        title="Código del agente"
        className="
    fixed top-1/2 right-0 -translate-y-1/2
    z-40

    bg-gradient-to-b from-gray-900 to-black
    text-blue-400

    p-3
    rounded-l-full

    border border-gray-700
    shadow-[0_0_18px_rgba(59,130,246,0.35)]

    hover:shadow-[0_0_28px_rgba(59,130,246,0.55)]
    hover:text-blue-300

    transition-all duration-200 ease-out
    flex items-center justify-center
  "
      >
        <PhoneIcon className="w-5 h-5" />
      </button>

      {mostrarCodigo && (
        <div
          className="
      fixed top-1/2 right-14 -translate-y-1/2
      z-50
      w-80

      bg-gradient-to-b from-gray-900 to-gray-800
      border border-gray-700
      rounded-xl
      shadow-[0_20px_40px_rgba(0,0,0,0.6)]

      p-4
      text-gray-100
    "
        >
          {/* HEADER */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest text-blue-400">
              Seguridad
            </div>
            <div className="text-sm font-semibold">Código del agente</div>
          </div>

          {/* INPUT */}
          <input
            type="text"
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value)}
            placeholder="AGT-1234"
            className="
        w-full px-3 py-2 text-sm
        rounded-md

        bg-gray-950
        border border-gray-700
        text-gray-100
        placeholder-gray-500

        focus:outline-none
        focus:ring-2 focus:ring-blue-500
        focus:border-blue-500

        transition
      "
          />

          {/* FOOTER */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setMostrarCodigo(false)}
              className="
          text-xs px-3 py-1.5 rounded-md
          bg-gray-700 text-gray-200
          hover:bg-gray-600
          transition
        "
            >
              Cancelar
            </button>

            <button
              onClick={() => {
                if (!codigoInput.trim()) {
                  toast.error("Debes ingresar un código válido");
                  return;
                }

                setCodigoAgente(codigoInput.trim());
                setMostrarCodigo(false);
                toast.success("Código del agente guardado por 8 horas");
              }}
              className="
          flex items-center gap-2
          text-xs font-semibold
          px-4 py-1.5 rounded-md

          bg-gradient-to-r from-blue-600 to-blue-500
          text-white

          shadow-md
          hover:from-blue-500 hover:to-blue-400
          hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]

          focus:outline-none
          focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-gray-900

          transition-all
        "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                className="w-4 h-4 fill-current"
              >
                <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 237.3C544 220.3 537.3 204 525.3 192L448 114.7C436 102.7 419.7 96 402.7 96L160 96zM192 192C192 174.3 206.3 160 224 160L384 160C401.7 160 416 174.3 416 192L416 256C416 273.7 401.7 288 384 288L224 288C206.3 288 192 273.7 192 256L192 192zM320 352C355.3 352 384 380.7 384 416C384 451.3 355.3 480 320 480C284.7 480 256 451.3 256 416C256 380.7 284.7 352 320 352z" />
              </svg>
              Guardar
            </button>
          </div>
        </div>
      )}

      <div
        className={`p-6 bg-gray-100 min-h-screen grid grid-cols-2 gap-6 text-black 
  ${casoCriticoSeleccionado ? "pointer-events-none" : ""}
    `}
      >
        <ModalLlamadaCabina
          abierto={modalLlamadaAbierto}
          evento={eventoLlamada}
          onColgar={() => {
            llamadaActivaRef.current = null;
            setModalLlamadaAbierto(false);
            setEventoLlamada(null);
          }}
        />
        {casoCriticoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-white rounded-lg w-[1000px] max-w-full max-h-[85vh] flex flex-col shadow mt-10">
              {/* ================= HEADER (FIJO) ================= */}
              <div className="px-6 py-4 border-b flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Caso crítico
                  </h2>
                  <p className="text-xs text-gray-500">
                    Unidad {casoCriticoSeleccionado.unidad}
                  </p>
                </div>

                <button
                  onClick={() => setCasoCriticoSeleccionado(null)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>

              {/* ================= BODY (SCROLL ÚNICO) ================= */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* INFO GENERAL */}
                <div className="text-xs text-gray-700 space-y-1">
                  <div>
                    <strong>Tipos involucrados:</strong>{" "}
                    {casoCriticoSeleccionado.combinacion}
                  </div>
                  <div>
                    <strong>Total de alertas:</strong>{" "}
                    {casoCriticoSeleccionado.eventos.length}
                  </div>
                </div>

                {/* FILTRO */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-700">
                    Filtrar por tipo de alerta
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroTipoAlerta("TODOS")}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border
                ${
                  filtroTipoAlerta === "TODOS"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                    >
                      TODOS ({casoCriticoSeleccionado.eventos.length})
                    </button>

                    {tiposDisponibles.map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => setFiltroTipoAlerta(tipo)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border
                  ${
                    filtroTipoAlerta === tipo
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                      >
                        {tipo} ({conteoPorTipo[tipo]})
                      </button>
                    ))}
                  </div>
                </div>

                {/* HISTORIAL */}
                <div className="border rounded-md p-3 max-h-72 overflow-auto text-xs space-y-3">
                  {eventosFiltrados.map((e, i) => (
                    <div key={i} className="border-b last:border-b-0 py-2">
                      {/* LINEA 1 */}
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-red-600 uppercase shrink-0">
                            {normalize(e.tipo)}
                          </span>

                          {formatearFechaHora(e.mensaje) && (
                            <span className="text-gray-500 shrink-0">
                              {formatearFechaHora(e.mensaje).fecha} ·{" "}
                              {formatearFechaHora(e.mensaje).hora}
                            </span>
                          )}

                          {extraerVelocidad(e.mensaje) && (
                            <span className="text-gray-500 shrink-0">
                              {extraerVelocidad(e.mensaje)}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-gray-400 shrink-0">
                          #{e.id}
                        </span>
                      </div>

                      {/* LINEA 2 */}
                      {extraerLugar(e.mensaje) && (
                        <div className="text-[11px] text-gray-600 truncate">
                          {extraerLugar(e.mensaje)}
                        </div>
                      )}

                      {/* EXPANDIBLE */}
                      <MensajeExpandable mensaje={e.mensaje} />

                      {/* MAPA INLINE */}
                      {extraerMapsUrl(e.mensaje) && (
                        <a
                          href={extraerMapsUrl(e.mensaje)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Ver ubicación
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* EVALUACIÓN OPERATIVA */}
                <EvaluacionOperativa
                  value={evaluacionCritica}
                  onChange={setEvaluacionCritica}
                  contextoEvento={contextoEvento}
                />

                {/* CIERRE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Motivo de cierre <span className="text-red-500">*</span>
                  </label>

                  <Select
                    options={MOTIVOS_CIERRE.map((m) => ({
                      value: m.value,
                      label: m.label,
                    }))}
                    value={
                      motivoCierre
                        ? { value: motivoCierre, label: motivoCierre }
                        : null
                    }
                    onChange={(opt) => setMotivoCierre(opt?.value || "")}
                    placeholder="Selecciona motivo de cierre..."
                    isSearchable
                    className="text-xs"
                    styles={{
                      control: (base) => ({
                        ...base,
                        fontSize: "12px",
                        minHeight: "38px",
                      }),
                      menu: (base) => ({
                        ...base,
                        fontSize: "12px",
                        zIndex: 9999,
                      }),
                    }}
                  />

                  {/* ✍️ OBSERVACIONES SI ES OTRO */}
                  {motivoCierre === "OTRO" && (
                    <textarea
                      value={observacionesCierre}
                      onChange={(e) => setObservacionesCierre(e.target.value)}
                      rows={3}
                      className="mt-2 w-full border border-gray-300 rounded-md p-2 text-xs"
                      placeholder="Describe brevemente el motivo"
                    />
                  )}
                </div>
              </div>

              {/* ================= FOOTER (FIJO) ================= */}
              <div className="border-t px-6 py-3 flex justify-end gap-2 bg-gray-50">
                <button
                  onClick={() => {
                    resetearProtocolos();
                    setMotivoCierre("");
                    setObservacionesCierre("");
                    setCasoCriticoSeleccionado(null);
                  }}
                  className="text-xs bg-gray-200 px-4 py-1 rounded"
                >
                  Cancelar
                </button>

                <button
                  onClick={async () => {
                    // 🚫 1) VALIDAR MOTIVO
                    if (!motivoCierre) {
                      toast.error("Debes seleccionar un motivo de cierre");
                      return;
                    }

                    // 🚫 2) VALIDAR EVALUACIÓN
                    const preguntasVisibles = preguntasActuales.filter((p) => {
                      if (!p.dependsOn) return true;
                      return (
                        evaluacionCritica[p.dependsOn]?.respuesta === p.showIf
                      );
                    });

                    const faltantes = preguntasVisibles.filter((p) => {
                      const r = evaluacionCritica[p.key];
                      return !r || typeof r.respuesta !== "boolean";
                    });

                    if (faltantes.length > 0) {
                      toast.error(
                        "Debes completar toda la evaluación operativa",
                      );
                      return;
                    }

                    const result = await Swal.fire({
                      title: "Cerrar caso crítico",
                      html: `
        <p>Estás a punto de cerrar un <b>caso crítico</b>.</p>
        <p>Esta acción cerrará <b>todas las alertas asociadas</b>.</p>
      `,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: "Sí, cerrar caso",
                      cancelButtonText: "Cancelar",
                      confirmButtonColor: "#dc2626",
                      cancelButtonColor: "#6b7280",
                    });

                    if (!result.isConfirmed) return;

                    const idUsuario =
                      usuario?.id_usuario ?? usuario?.id ?? usuario?.sub;
                    const nombreUsuario = usuario?.nombre ?? usuario?.name;

                    if (!idUsuario || !nombreUsuario) {
                      toast.error(
                        "Usuario inválido, no se puede cerrar el caso",
                      );
                      return;
                    }

                    const cierreJSON = {
                      motivo: motivoCierre,
                      observaciones: observacionesCierre || "",
                      evaluacionOperativa: evaluacionCritica,
                      evaluacionTexto: evaluacionTexto,
                      unidad: casoCriticoSeleccionado.unidad,
                      idCaso: casoCriticoSeleccionado.id,
                      alertas: casoCriticoSeleccionado.eventos.map((e) => e.id),
                      usuario: {
                        id: idUsuario,
                        nombre: nombreUsuario,
                      },
                      fechaCierreISO: new Date().toISOString(),
                    };

                    try {
                      const resp = await fetch(
                        `${API_URL}/alertas/cerrar-multiples`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            alertas: casoCriticoSeleccionado.eventos.map(
                              (e) => e.id,
                            ),
                            id_usuario: idUsuario,
                            nombre_usuario: nombreUsuario,
                            detalle_cierre: JSON.stringify(cierreJSON, null, 2), // ✅ AQUÍ LO PEGAS
                          }),
                        },
                      );
                      const text = await resp.text();
                      console.log("RESP STATUS:", resp.status);
                      console.log("RESP BODY:", text);
                      console.log(resp);
                      if (!resp.ok) {
                        const errorText = await resp.text();
                        throw new Error(errorText);
                      }

                      cerrarModalYEliminarCaso(casoCriticoSeleccionado.id);
                      toast.success("✅ Caso crítico cerrado correctamente");
                    } catch (error) {
                      console.error("❌ Error cerrando caso crítico:", error);
                      toast.error("No se pudo cerrar el caso crítico");
                    }
                  }}
                  disabled={
                    !motivoCierre ||
                    (motivoCierre === "OTRO" &&
                      observacionesCierre.trim().length < 10)
                  }
                  className={`text-xs px-4 py-1 rounded text-white
    ${
      !motivoCierre ||
      (motivoCierre === "OTRO" && observacionesCierre.trim().length < 10)
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-red-600 hover:bg-red-700"
    }`}
                >
                  Cerrar caso crítico
                </button>
              </div>
            </div>
          </div>
        )}

        {casoSeleccionado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[500px] max-w-full p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-xs text-gray-500">Unidad</div>
                  <div className="font-bold">{casoSeleccionado.unidad}</div>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Monitorista asignado
                  </label>

                  <p className="text-sm font-medium text-gray-800">
                    {usuario.name || "—"}
                  </p>
                </div>

                <button
                  onClick={() => setCasoSeleccionado(null)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-gray-700 space-y-1">
                <div>
                  <strong>Estado actual:</strong> {casoSeleccionado.estado}
                </div>
                <div>
                  <strong>Tipos:</strong>{" "}
                  {resumenReps(casoSeleccionado.repeticiones)}
                </div>
              </div>

              <div className="mt-3 border-t pt-3 text-xs text-gray-800">
                <strong>Último mensaje:</strong>
                <MensajeExpandable
                  mensaje={casoSeleccionado.eventos[0].mensaje}
                />
              </div>

              {extraerMapsUrl(casoSeleccionado.eventos[0].mensaje) && (
                <a
                  href={extraerMapsUrl(casoSeleccionado.eventos[0].mensaje)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-[11px] text-gray-600 underline"
                >
                  Ver ubicación en Google Maps
                </a>
              )}
              {/* 📝 CIERRE DE ALERTA */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motivo de cierre <span className="text-red-500">*</span>
                </label>

                <Select
                  options={MOTIVOS_CIERRE.map((m) => ({
                    value: m.value,
                    label: m.label,
                  }))}
                  value={
                    motivoCierre
                      ? { value: motivoCierre, label: motivoCierre }
                      : null
                  }
                  onChange={(opt) => setMotivoCierre(opt?.value || "")}
                  placeholder="Selecciona motivo de cierre..."
                  isSearchable
                  className="text-xs"
                  styles={{
                    control: (base) => ({
                      ...base,
                      fontSize: "12px",
                      minHeight: "38px",
                    }),
                    menu: (base) => ({
                      ...base,
                      fontSize: "12px",
                      zIndex: 9999,
                    }),
                  }}
                />

                {/* ✍️ OBSERVACIONES SI ES OTRO */}
                {motivoCierre === "OTRO" && (
                  <textarea
                    value={detalleCierre}
                    onChange={(e) => setDetalleCierre(e.target.value)}
                    rows={3}
                    placeholder="Describe brevemente el motivo"
                    className="mt-2 w-full border border-gray-300 rounded-md p-2 text-xs"
                  />
                )}
              </div>

              {/* ACCIONES */}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setMotivoCierre("");
                    setDetalleCierre("");
                    setCasoSeleccionado(null);
                  }}
                  className="text-xs bg-gray-300 px-3 py-1 rounded"
                >
                  Mantener abierto
                </button>

                <button
                  onClick={async () => {
                    // 🚫 1) VALIDACIÓN FUERTE
                    if (!motivoCierre) {
                      toast.error("Debes seleccionar un motivo de cierre");
                      return;
                    }

                    if (
                      motivoCierre === "OTRO" &&
                      detalleCierre.trim().length < 10
                    ) {
                      toast.error("Debes escribir una observación válida");
                      return;
                    }

                    // ✅ CONFIRMACIÓN SWEET ALERT
                    const result = await Swal.fire({
                      title: "Cerrar alerta",
                      html: `
        <p>Estás a punto de cerrar esta <b>alerta</b>.</p>
        <p>¿Deseas continuar?</p>
      `,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: "Sí, cerrar alerta",
                      cancelButtonText: "Cancelar",
                      confirmButtonColor: "#16a34a",
                      cancelButtonColor: "#6b7280",
                    });

                    if (!result.isConfirmed) return;

                    const idUsuario =
                      usuario?.id_usuario ?? usuario?.id ?? usuario?.sub;
                    const nombreUsuario = usuario?.nombre ?? usuario?.name;

                    if (!idUsuario || !nombreUsuario) {
                      toast.error(
                        "Usuario inválido, no se puede cerrar la alerta",
                      );
                      return;
                    }

                    // ✅ JSON COMPLETO PARA ALERTA NORMAL
                    const cierreJSON = {
                      tipoCierre: "ALERTA_NORMAL",
                      motivo: motivoCierre,
                      observaciones:
                        motivoCierre === "OTRO" ? detalleCierre.trim() : "",
                      unidad: casoSeleccionado.unidad,
                      idCaso: casoSeleccionado.id,
                      alerta: casoSeleccionado.eventos[0].id,
                      tipoAlerta: casoSeleccionado.eventos[0].tipoNorm,
                      mensaje: casoSeleccionado.eventos[0].mensaje,
                      usuario: {
                        id: idUsuario,
                        nombre: nombreUsuario,
                      },
                      fechaCierreISO: new Date().toISOString(),
                    };

                    try {
                      const resp = await fetch(`${API_URL}/alertas/cerrar`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          id_alerta: casoSeleccionado.eventos[0].id,
                          id_usuario: idUsuario,
                          nombre_usuario: nombreUsuario,

                          // 🔥 JSON guardado como texto en SQL
                          detalle_cierre: JSON.stringify(cierreJSON, null, 2),
                        }),
                      });

                      const text = await resp.text();
                      console.log("RESP STATUS:", resp.status);
                      console.log("RESP BODY:", text);

                      if (!resp.ok) {
                        throw new Error(text || "Error cerrando alerta");
                      }

                      cerrarModalYEliminarCaso(String(casoSeleccionado.id));
                      toast.success("✅ Alerta cerrada correctamente");
                    } catch (error) {
                      console.error("❌ Error cerrando alerta:", error);
                      toast.error("No se pudo cerrar la alerta");
                    }
                  }}
                  disabled={
                    !motivoCierre ||
                    (motivoCierre === "OTRO" &&
                      detalleCierre.trim().length < 10)
                  }
                  className={`text-xs px-3 py-1 rounded text-white
    ${
      !motivoCierre ||
      (motivoCierre === "OTRO" && detalleCierre.trim().length < 10)
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-green-600 hover:bg-green-700"
    }
  `}
                >
                  Cerrar caso
                </button>
              </div>
            </div>
          </div>
        )}

        <audio ref={sirena} src="/sounds/sirena.mp3" preload="auto" loop />

        {/* ACTIVOS */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 h-[calc(100vh-140px)] flex flex-col">
          <div className="flex justify-between mb-4 items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Alertas</h2>
              {/*               <ResumenCargaAlertas
                totalAlertas={totalAlertas}
                alertasFiltradas={alertasFiltradas}
                alertasProcesadas={alertasProcesadas}
                cargaTerminada={cargaTerminada}
              /> */}

              <span className="bg-emerald-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {activos.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {activos.map((c) => (
              <CasoActivoCard
                key={c.id}
                caso={c}
                isSelected={casoSeleccionado?.id === c.id}
                onToggle={toggleCaso}
                onAnalizar={analizarCaso}
                onMapa={verMapa}
                onLlamarOperador={llamarOperadorCb}
                resumenReps={resumenReps}
                esPanico={esPanico}
                extraerZonas={extraerZonas}
                normalize={normalize}
                formatearFechaHora={formatearFechaHora}
                extraerLugar={extraerLugar}
                extraerVelocidad={extraerVelocidad}
                extraerMapsUrl={extraerMapsUrl}
                MensajeExpandable={MensajeExpandable}
                onLlamarCabina={llamarCabina} // ✅ ESTA ES LA CLAVE
              />
            ))}

            {activos.length === 0 && (
              <div className="text-sm text-gray-500">Sin alertas activas.</div>
            )}
          </div>
        </div>
        {/* IA CONVERSACIONAL */}
        {/*       <div className="mt-4 border rounded p-3 bg-gray-50">
          <div className="text-xs font-bold mb-2">
            🤖 Conversación con operador
          </div>

          {conversacionIA.map((m, i) => (
            <div key={i} className="text-xs mb-1">
              <strong>{m.from === "ia" ? "IA:" : "Operador:"}</strong> {m.text}
            </div>
          ))}
        </div>
  */}
        {/* CRÍTICOS */}
        <div className="bg-red-50 rounded-xl shadow p-4 border border-red-300 h-[calc(100vh-140px)] flex flex-col">
          <div className="flex justify-between mb-4 items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-red-700">
                🔥 Alertas Críticas
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full text-white
        ${criticos.length > 0 ? "bg-red-600 animate-pulse" : "bg-red-400"}
      `}
              >
                {criticos.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {criticos.map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) criticosRefs.current[c.id] = el;
                }}
              >
                <CasoCriticoCard
                  key={c.id}
                  caso={c}
                  isSelected={idCriticoFijo === c.id}
                  hayCriticoFijo={!!idCriticoFijo}
                  onProtocolo={(caso) => {
                    setIdCriticoFijo(caso.id); // 🔒 ANCLA
                    setCasoCriticoSeleccionado(caso); // abre modal
                  }}
                  onAnalizar={analizarCaso}
                  onMapa={verMapa}
                  onLlamarOperador={llamarOperadorCb}
                  esPanico={esPanico}
                  extraerZonas={extraerZonas}
                  formatearFechaHoraCritica={formatearFechaHoraCritica}
                  extraerLugar={extraerLugar}
                  extraerVelocidad={extraerVelocidad}
                  extraerMapsUrl={extraerMapsUrl}
                  MensajeExpandable={MensajeExpandable}
                  onLlamarCabina={llamarCabina}
                />
              </div>
            ))}

            {criticos.length === 0 && (
              <div className="text-sm text-red-700/70">
                Sin alertas críticas por el momento.
              </div>
            )}
          </div>
        </div>
        {/* 🗺 MODAL MAPA UNIDAD */}
        {mapaUnidad && (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
            <div className="bg-white rounded-xl w-[900px] h-[600px] shadow relative">
              {/* HEADER */}
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="text-sm font-bold">
                  📍 Ubicación en tiempo real — {mapaUnidad.unidad}
                </div>

                <button
                  onClick={() => setMapaUnidad(null)}
                  className="text-gray-500 hover:text-black text-lg"
                >
                  ✕
                </button>
              </div>

              {/* MAPA */}
              <div className="w-full h-[calc(100%-40px)]">
                <MapaUnidadLive
                  key={mapaUnidad.unitId} // 🔥 OBLIGATORIO
                  unitId={mapaUnidad.unitId}
                  alerta={mapaUnidad.alerta}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
