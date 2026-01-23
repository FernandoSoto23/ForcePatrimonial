import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useReducer,
} from "react";

import { io } from "socket.io-client";
import { ShieldAlert, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import { useUnits } from "../../context/UnitsContext";
import Swal from "sweetalert2";
import ProtocolLauncher from "./components/ProtocoloLauncher";
import MapaUnidadLive from "./components/MapaUnidadLive";
import { loadGeocercasOnce } from "./utils/geocercasCache";
import ProtocoloAsaltoUnidadUI from "./components/ProtocoloAsaltoUnidadUI";
import FlowRunnerBotonPanico from "./components/FlowRunnerBotonPanico";
import ProtocoloDesvioRutaNoAutorizadoUI from "./components/ProtocoloDesvioRutaNoAutorizadoUI";
import ProtocoloEnfermedad from "./components/ProtocoloEnfermedad";
import InseguridadSinRiesgo from "./components/InseguridadSinRiesgo";
import UnidadDetenida from "./components/UnidadDetenida";
import UnidadSinSenal from "./components/UnidadSinSenal";

import EvaluacionOperativa from "./components/EvaluacionOperativa/EvaluacionOperativa";
import { PREGUNTAS_EVALUACION } from "./components/EvaluacionOperativa/preguntasEvaluacion";
import { detectarGeocercasParaAlerta } from "./utils/geocercasDetector";
import { tsCaso, esPanico } from "./utils/casos";
import { obtenerUnitIdDesdeNombre } from "./utils/unidades";
import CasoActivoCard from "./components/CasoActivoCard";
import CasoCriticoCard from "./components/CasoCriticoCard";
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
/* ============================================================
    CONFIG   VARIABLES GLOBALES
  ============================================================ */

const TWILIO_BACKEND = "http://localhost:4000";

const API_URL = "https://apipx.onrender.com";
const SOCKET_URL = "https://apipx.onrender.com";
const VENTANA = 10 * 60 * 1000; // 10 minutos para correlación
const DEDUP_TTL = 90 * 1000; // 90s para evitar duplicados API+WS / reenvíos
const SLTA_LABEL = {
  S: "Sucursal",
  L: "Local",
  T: "Taller",
  A: "Agencia",
};
const MOTIVOS_CIERRE = [
  { value: "FALSA_ALARMA", label: "Falsa alarma" },
  { value: "EVENTO_ATENDIDO", label: "Evento atendido sin novedad" },
  { value: "CONTACTO_CON_OPERADOR", label: "Contacto con operador / chofer" },
  { value: "PROBLEMA_TECNICO", label: "Problema técnico del dispositivo" },
  { value: "DESVIO_JUSTIFICADO", label: "Desvío de ruta justificado" },
  { value: "DETENCION_AUTORIZADA", label: "Detención autorizada" },
  { value: "OTRO", label: "Otro (requiere observación)" },
];
const MOTIVOS_CIERRE_ALERTA = [
  {
    value: "FALSA_ALARMA",
    label: "Falsa alarma",
    body: "Se valida la alerta y se confirma que corresponde a una falsa alarma."
  },
  {
    value: "EVENTO_ATENDIDO",
    label: "Evento atendido sin novedad",
    body: "Se realiza monitoreo y contacto, sin detectar riesgo para la unidad."
  },
  {
    value: "CONTACTO_OPERADOR",
    label: "Contacto con operador / chofer",
    body: "Se establece comunicación con el operador y se confirma operación normal."
  },
  {
    value: "PROBLEMA_TECNICO",
    label: "Problema técnico",
    body: "La alerta se genera por falla técnica del dispositivo."
  },
  {
    value: "OTRO",
    label: "Otro (requiere observación)",
    body: ""
  }
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
        if (actual.eventos.some(e => e.id === nuevoEvento.id)) {
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
      const eventosNoS = actual.eventos.filter(
        e => e.geocercaSLTA !== "S"
      );



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

    default:
      return state;
  }
}


export default function Casos() {
  /* VARIABLES DE ESTADO */
  /* USE STATE */

  const [filtroTipoAlerta, setFiltroTipoAlerta] = useState("TODOS");
  const [casos, dispatchCasos] = useReducer(casosReducer, {});
  const sirena = useRef(null);
  const [evaluacionCritica, setEvaluacionCritica] = useState(
    Object.fromEntries(PREGUNTAS_EVALUACION.map((p) => [p.key, null])),
  );
  const [showMsg, setShowMsg] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [casoCriticoSeleccionado, setCasoCriticoSeleccionado] = useState(null);
  const [detalleCierre, setDetalleCierre] = useState("");
  const [motivoCierre, setMotivoCierre] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [idCriticoFijo, setIdCriticoFijo] = useState(null);

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

  /* USE REF */
  const twilioDeviceRef = useRef(null);
  const unidadesUsuarioRef = useRef(new Set());
  const unidadValidaCacheRef = useRef(new Map());
  const unidadesMapRef = useRef(new Map());
  const bufferRef = useRef([]);
  const { units, loading: loadingUnits } = useUnits();
  const criticosRefs = useRef({});
  /* USE MEMO */
  const lista = useMemo(() => {
    return Object.values(casos)
      .filter((c) => Array.isArray(c.eventos))
      .sort((a, b) => tsCaso(b) - tsCaso(a));
  }, [casos]);

  const preguntasVisibles = useMemo(() => {
    return PREGUNTAS_EVALUACION.filter((p) => {
      if (!p.dependsOn) return true;

      return evaluacionCritica[p.dependsOn] === p.showIf;
    });
  }, [evaluacionCritica]);
  const activos = useMemo(() => lista.filter((c) => !c.critico), [lista]);

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
  const evaluacionTexto = Object.entries(evaluacionCritica)
    .map(([key, value]) => {
      const pregunta = PREGUNTAS_EVALUACION.find((p) => p.key === key);
      if (!pregunta || value === null) return null;
      return `- ${pregunta.label}: ${value ? "Sí" : "No"}`;
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

  const VENTANA_CORRELACION = 10 * 60 * 1000; // 10 minutos
  const procesarAlerta = (data) => {
    // ===============================
    // 1️⃣ VALIDACIONES BÁSICAS
    // ===============================
    if (!data) return;

    const mensaje = safeDecode(data.mensaje || "");
    const unidadRaw = (data.unidad || "").trim();
    const tipoRaw = (data.tipo || "").trim();

    if (!mensaje || !unidadRaw || !tipoRaw) return;

    const unidadKey = normalize(unidadRaw);
    const tipoNorm = normalize(tipoRaw);

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
    setEvaluacionCritica(
      Object.fromEntries(PREGUNTAS_EVALUACION.map((p) => [p.key, null]))
    );


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

  useEffect(() => {
    if (loadingUnits) return;
    if (unidadesUsuarioRef.current.size === 0) return;
    let cancel = false;

    const cargarAlertas = async () => {
      try {
        const resp = await fetch(`${API_URL}/alertas/activas`);
        const data = await resp.json();
        if (cancel) return;
        const todas = data ?? [];
        setTotalAlertas(todas.length);

        // 🔐 filtrar por unidades del usuario
        const filtradas = todas.filter((a) =>
          unidadPerteneceAlUsuario(a.unidad),
        );
        console.log(filtradas);
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
  }, [loadingUnits, units]);
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
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("nueva_alerta", (a) => {
      bufferRef.current.push({
        id: a.id ?? a.alertaId ?? a.id_alerta,
        mensaje: a.message ?? a.mensaje ?? "",
        unidad: a.unitName ?? a.unidad ?? "",
        tipo: a.alertType ?? a.tipo ?? "",
        geocerca_slta: a.geocerca_slta ?? null,
        geocercas_json: a.geocercas_json ?? null,
      });
    });
    socket.on("operador_speech", (data) => {
      setConversacionIA((prev) => [
        ...prev,
        { from: "operador", text: data.text },
      ]);
    });

    socket.on("ia_speech", (data) => {
      setConversacionIA((prev) => [...prev, { from: "ia", text: data.text }]);
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  return (
    <div
      className={`p-6 bg-gray-100 min-h-screen grid grid-cols-2 gap-6 text-black 
  ${casoCriticoSeleccionado ? "pointer-events-none" : ""}
    `}
    >
      {casoCriticoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 mt-5 pointer-events-auto">
          <div className="bg-white rounded-xl w-[1000px] max-w-full p-6 shadow mt-10 max-h-[80vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-red-700">
                  🚨 Protocolo de Emergencia
                </h2>
                <p className="text-sm text-gray-600">
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

            {/* INFO GENERAL */}
            <div className="text-xs text-gray-700 space-y-1 mb-4">
              <div>
                <strong>Tipos involucrados:</strong>{" "}
                {casoCriticoSeleccionado.combinacion}
              </div>
              <div>
                <strong>Total de alertas:</strong>{" "}
                {casoCriticoSeleccionado.eventos.length}
              </div>
            </div>
            {/* FILTRO + CONTEO */}
            <div className="mb-4 space-y-2">
              <div className="text-xs font-semibold text-gray-700">
                Filtrar por tipo de alerta
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTipoAlerta("TODOS")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border
          ${filtroTipoAlerta === "TODOS"
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
            ${filtroTipoAlerta === tipo
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    {tipo} ({conteoPorTipo[tipo]})
                  </button>
                ))}
              </div>
            </div>

            {/* HISTORIAL DETALLADO */}
            <div className="border rounded-md p-3 max-h-72 overflow-auto text-xs space-y-3">
              {eventosFiltrados.map((e, i) => (
                <div key={i} className="border-b last:border-b-0 pb-3">
                  {/* ENCABEZADO */}
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-red-700">
                      {normalize(e.tipo)}
                    </strong>
                    <span className="text-[11px] text-gray-500">
                      ID #{e.id}
                    </span>
                  </div>

                  {/* DETALLES */}
                  <div className="space-y-1 text-[11px] text-gray-700 ml-1">
                    {formatearFechaHora(e.mensaje) && (
                      <>
                        <div>
                          <strong>Fecha:</strong>{" "}
                          {formatearFechaHora(e.mensaje).fecha}
                        </div>
                        <div>
                          <strong>Hora:</strong>{" "}
                          {formatearFechaHora(e.mensaje).hora}
                        </div>
                      </>
                    )}

                    {extraerLugar(e.mensaje) && (
                      <div>
                        <strong>Lugar:</strong> {extraerLugar(e.mensaje)}
                      </div>
                    )}

                    {extraerVelocidad(e.mensaje) && (
                      <div>
                        <strong>Velocidad:</strong>{" "}
                        {extraerVelocidad(e.mensaje)}
                      </div>
                    )}
                  </div>

                  {/* MENSAJE COMPLETO */}
                  <MensajeExpandable mensaje={e.mensaje} />

                  {/* MAPA */}
                  {extraerMapsUrl(e.mensaje) && (
                    <a
                      href={extraerMapsUrl(e.mensaje)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[11px] text-blue-600 underline"
                    >
                      Ver ubicación en Google Maps
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* ACCIONES */}
            {/* ACCIONES DEL PROTOCOLO */}
            {/* 🧠 EVALUACIÓN OPERATIVA */}
            <EvaluacionOperativa
              value={evaluacionCritica}
              onChange={setEvaluacionCritica}
            />

            {/* 📝 NOTA DE CIERRE CASO CRÍTICO */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Descripción de cierre del caso crítico{" "}
                <span className="text-red-500">*</span>
              </label>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motivo de cierre <span className="text-red-500">*</span>
                </label>

                <select
                  value={motivoCierre}
                  onChange={(e) => setMotivoCierre(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white"
                >
                  <option value="">Selecciona un motivo</option>
                  {MOTIVOS_CIERRE.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* 👇 SOLO SI ES OTRO */}
                {motivoCierre === "OTRO" && (
                  <textarea
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    rows={3}
                    placeholder="Describe brevemente el motivo"
                    className="mt-2 w-full border border-gray-300 rounded-md p-2 text-xs"
                  />
                )}
              </div>

              <div className="text-[10px] text-gray-500 mt-1">
                {detalleCierreFinal.length} caracteres
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  resetearProtocolos();
                  setMotivoCierre("");
                  setObservacionesCierre("");
                  setCasoCriticoSeleccionado(null);
                }}
                className="text-xs bg-gray-300 px-4 py-1 rounded"
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

                  // 🚫 2) VALIDAR OBSERVACIONES SI ES OTRO
                  if (
                    evaluacionCritica.contactoUnidad === null ||
                    evaluacionCritica.camarasRevisadas === null
                  ) {
                    toast.error(
                      "Debes completar la evaluación operativa del evento",
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

                  // ======= PEGA ESTO AQUÍ =======
                  const idUsuario = usuario?.id_usuario ?? usuario?.id ?? usuario?.sub;
                  const nombreUsuario = usuario?.nombre ?? usuario?.name;

                  if (!idUsuario || !nombreUsuario) {
                    toast.error("Usuario inválido, no se puede cerrar el caso");
                    return;
                  }
                  // ======= HASTA AQUÍ =======

                  try {
                    console.log(API_URL)
                    const resp = await fetch(
                      `${API_URL}/alertas/cerrar-multiples`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          alertas: casoCriticoSeleccionado.eventos.map(e => e.id),
                          id_usuario: idUsuario,
                          nombre_usuario: nombreUsuario,
                          detalle_cierre: `
Motivo: ${motivoCierre}
${observacionesCierre ? `Observaciones: ${observacionesCierre}` : ""}

Evaluación operativa:
${evaluacionTexto}

Cierre realizado por: ${nombreUsuario}
Fecha cierre: ${new Date().toLocaleString()}
Unidad: ${casoCriticoSeleccionado.unidad}
`.trim(),
                        }),
                      },
                    );
                    console.log(JSON.stringify({
                      alertas: casoCriticoSeleccionado.eventos.map(e => e.id),
                      id_usuario: idUsuario,
                      nombre_usuario: nombreUsuario,
                      detalle_cierre: `
Motivo: ${motivoCierre}
${observacionesCierre ? `Observaciones: ${observacionesCierre}` : ""}

Evaluación operativa:
${evaluacionTexto}

Cierre realizado por: ${nombreUsuario}
Fecha cierre: ${new Date().toLocaleString()}
Unidad: ${casoCriticoSeleccionado.unidad}
`.trim(),
                    }));
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
                className={`text-xs px-4 py-1 rounded text-white transition
      ${!motivoCierre ||
                    (motivoCierre === "OTRO" && observacionesCierre.trim().length < 10)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                  }
    `}
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

              <select
                value={motivoCierre}
                onChange={(e) => {
                  const value = e.target.value;
                  setMotivoCierre(value);

                  const motivo = MOTIVOS_CIERRE_ALERTA.find(
                    (m) => m.value === value
                  );

                  if (motivo) {
                    setDetalleCierre(motivo.body);
                  }
                }}
                className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white"
              >
                <option value="">Selecciona un motivo</option>
                {MOTIVOS_CIERRE_ALERTA.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

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
                onClick={() => setCasoSeleccionado(null)}
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

                  if (motivoCierre === "OTRO" && detalleCierre.trim().length < 10) {
                    toast.error("Debes escribir una observación válida");
                    return;
                  }

                  const confirmar = window.confirm(
                    "¿Te gustaría cambiar el estado de esta alerta?",
                  );

                  if (!confirmar) return;

                  try {
                    // ✅ 2) BACKEND PRIMERO
                    const resp = await fetch(`${API_URL}/alertas/cerrar`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        id_alerta: casoSeleccionado.eventos[0].id,
                        id_usuario: usuario.id,
                        nombre_usuario: usuario.name,
                        detalle_cierre: detalleCierre, // ✅ AQUÍ VA LA NOTA
                      }),
                    });

                    if (!resp.ok) {
                      const errorText = await resp.text();
                      throw new Error(errorText || "Error cerrando alerta");
                    }

                    // ✅ 3) ACTUALIZAR ESTADO LOCAL SOLO SI BACKEND OK
                    cerrarModalYEliminarCaso(String(casoSeleccionado.id));
                    toast.success(
                      `La alerta ${casoSeleccionado.eventos[0].tipo} fue cerrada correctamente`,
                    );
                  } catch (error) {
                    console.error("❌ Error cerrando alerta:", error);
                    toast.error(
                      "No se pudo cerrar la alerta. Intenta nuevamente.",
                    );
                  }
                }}
                disabled={
                  !motivoCierre ||
                  (motivoCierre === "OTRO" && detalleCierre.trim().length < 10)
                }
                className={`text-xs px-3 py-1 rounded text-white
      ${detalleCierre.trim().length < 50
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
            <h2 className="text-sm font-semibold text-gray-900">
              Alertas
            </h2>


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
  );
}
