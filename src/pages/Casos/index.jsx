import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ShieldAlert, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";

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
import { detectarGeocercasParaAlerta } from "./utils/geocercasDetector";
import { tsCaso, esPanico } from "./utils/casos";
import { obtenerUnitIdDesdeNombre } from "./utils/unidades";
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
/* ============================================================
   CONFIG   VARIABLES GLOBALES
============================================================ */
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

export default function Casos() {
  /* VARIABLES DE ESTADO */
  const [casos, setCasos] = useState({});
  const sirena = useRef(null);
  const [showMsg, setShowMsg] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [casoCriticoSeleccionado, setCasoCriticoSeleccionado] = useState(null);
  const [detalleCierre, setDetalleCierre] = useState("");
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
  const unidadesUsuarioRef = useRef(new Set());
  const unidadValidaCacheRef = useRef(new Map());
  const unidadesMapRef = useRef(new Map());

  /* USE MEMO */
  const lista = useMemo(() => {
    return Object.values(casos).sort((a, b) => tsCaso(b) - tsCaso(a));
  }, [casos]);
  const activos = useMemo(() => lista.filter((c) => !c.critico), [lista]);

  const criticos = useMemo(() => lista.filter((c) => c.critico), [lista]);
  /* FUNCIONES */
  function procesarEnLotes(
    items,
    procesar,
    batchSize = 200,
    onProgress,
    onFinish
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
  const procesarAlerta = (data) => {
    const mensaje = safeDecode(data.mensaje);
    const unidad = (data.unidad || "").trim();
    const tipo = (data.tipo || "").trim();
    if (!mensaje || !unidad || !tipo) return;

    const key = normalize(unidad);

    // 🔐 filtrar por unidades del usuario
    if (!unidadesUsuarioRef.current.has(key)) return;

    // 🗺 unitId ÚNICO Y CONFIABLE
    const unitId = unidadesMapRef.current.get(key);
    if (!unitId) {
      console.warn("⚠️ Unidad sin unitId:", unidad);
      return;
    }

    const tsRx = Date.now();
    let tsInc = tsRx;

    const fh = extraerFechaHora(mensaje);
    if (fh) {
      const [fecha, hora] = fh.split(" ");
      const parsed = buildTs(fecha, hora);
      if (parsed) tsInc = parsed;
    }

    const bloqueHora = obtenerBloqueHora(tsInc);
    const casoId = `${unidad}_${bloqueHora}`;
    const msgNorm = normalizarMensaje(mensaje);
    const tipoNorm = normalize(tipo);
    const alertaId = data.id;

    const coords = extraerLatLng(mensaje);
    const geocercasDetectadas = coords
      ? detectarGeocercasParaAlerta(coords.lat, coords.lng)
      : [];

    setCasos((prev) => {
      const copia = { ...prev };

      const actual = copia[casoId] || {
        id: casoId,
        unidad,
        unitId, // ✅ YA NO SE PIERDE
        eventos: [],
        repeticiones: {},
        critico: false,
        expanded: false,
        estado: "NUEVO",
      };

      const yaExiste = actual.eventos.some((e) => {
        if (alertaId != null && e.id != null) {
          return String(e.id) === String(alertaId);
        }
        if (normalize(e.tipo) !== tipoNorm) return false;
        const eMsgNorm = normalizarMensaje(e.mensaje);
        return eMsgNorm === msgNorm && Math.abs(e.tsRx - tsRx) < DEDUP_TTL;
      });

      if (!yaExiste) {
        actual.eventos.push({
          id: alertaId,
          unidad,
          tipo,
          mensaje,
          tsRx,
          tsInc,
          geocercaSLTA: data.geocerca_slta || null,
          geocercas_json: data.geocercas_json || null,
          geocercas_detectadas: geocercasDetectadas,
        });
      }

      const reps = {};
      for (const e of actual.eventos) {
        const k = normalize(e.tipo);
        reps[k] = (reps[k] || 0) + 1;
      }

      actual.repeticiones = reps;

      const tiposUnicos = Object.keys(reps);
      const combinacion =
        tiposUnicos.length >= 2 ? tiposUnicos.join(" + ") : undefined;

      const critico =
        Boolean(combinacion) || Object.values(reps).some((n) => n >= 2);

      if (!actual.critico && critico) {
        sirena.current?.play().catch(() => {});
      }

      actual.critico = critico;
      actual.combinacion = combinacion;

      actual.eventos.sort((a, b) => b.tsInc - a.tsInc);

      copia[casoId] = actual;
      return copia;
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
  function cerrarModalYEliminarCaso(casoId) {
    // 1️⃣ cerrar modal PRIMERO
    setCasoSeleccionado(null);
    setCasoCriticoSeleccionado(null);

    // 2️⃣ limpiar texto
    setDetalleCierre("");
    resetearProtocolos();

    // 3️⃣ eliminar caso del estado
    setCasos((prev) => {
      const copia = { ...prev };
      delete copia[casoId];
      return copia;
    });
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);

      // ejemplo: decoded.usuario o decoded.user
      console.log(decoded);
      setUsuario(decoded);
    } catch (error) {
      console.error("Token inválido", error);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("wialon_units");
    if (!raw) return;

    const unidades = JSON.parse(raw);

    const set = new Set();
    const map = new Map();

    unidades.forEach((u) => {
      if (!u?.unidad || !u?.id) return;

      const key = normalize(u.unidad);
      set.add(key);
      map.set(key, u.id);
    });

    unidadesUsuarioRef.current = set;
    unidadesMapRef.current = map;

    console.log("🔐 Unidades cargadas:", set.size);
    console.log("🗺 Mapa unidad→id:", map.size);
  }, []);

  useEffect(() => {
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
          unidadPerteneceAlUsuario(a.unidad)
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
          }
        );
      } catch (e) {
        console.error("❌ Error cargando alertas:", e);
      }
    };

    cargarAlertas();

    return () => {
      cancel = true;
    };
  }, []);


  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("nueva_alerta", (a) => {
      // prioridad a lo que manda backend (unitName/alertType/message)
      procesarAlerta({
        id: a.id ?? a.alertaId ?? a.alert_id ?? a.id_alerta, // ✅ por si lo mandan con otro nombre
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

  return (
    <div className="p-6 bg-gray-100 min-h-screen grid grid-cols-2 gap-6 text-black mt-10">
      {casoCriticoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 mt-10">
          <div className="bg-white rounded-xl w-[1000px] max-w-full p-6 shadow-2xl mt-10 max-h-[80vh] overflow-y-auto">
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

            {/* HISTORIAL DETALLADO */}
            <div className="border rounded-md p-3 max-h-72 overflow-auto text-xs space-y-3">
              {casoCriticoSeleccionado.eventos.map((e, i) => (
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-10">
              {/* 🚚 ASALTO */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.asalto}
                  readOnly
                  className="mt-4 accent-green-600"
                />

                <ProtocolLauncher
                  label="Asalto Unidad"
                  icon="🚚"
                  variant="outline"
                  title="Protocolo — Asalto a Unidad"
                  subtitle="Checks · notas · exportación"
                  modalIcon={<span aria-hidden>🚚</span>}
                  onOpen={() => marcarProtocolo("asalto")}
                >
                  <ProtocoloAsaltoUnidadUI />
                </ProtocolLauncher>
              </div>

              {/* 🚨 PÁNICO */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.panico}
                  readOnly
                  className="mt-4 accent-red-600"
                />

                <ProtocolLauncher
                  label="Botón de pánico"
                  icon="🚨"
                  variant="outline"
                  title="Protocolo — Botón de pánico"
                  subtitle="Flujo guiado"
                  modalIcon={<span aria-hidden>🚨</span>}
                  onOpen={() => marcarProtocolo("panico")}
                >
                  <FlowRunnerBotonPanico />
                </ProtocolLauncher>
              </div>

              {/* 🧭 DESVÍO DE RUTA */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.desvio}
                  readOnly
                  className="mt-4 accent-indigo-600"
                />

                <ProtocolLauncher
                  label="Desvío ruta"
                  icon="🧭"
                  variant="outline"
                  title="Protocolo — Desvío de ruta"
                  subtitle="Checks y notas"
                  modalIcon={<span aria-hidden>🧭</span>}
                  onOpen={() => marcarProtocolo("desvio")}
                >
                  <ProtocoloDesvioRutaNoAutorizadoUI />
                </ProtocolLauncher>
              </div>

              {/* 💊 ENFERMEDAD */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.enfermedad}
                  readOnly
                  className="mt-4 accent-purple-600"
                />

                <ProtocolLauncher
                  label="Enfermedad"
                  icon="💊"
                  variant="outline"
                  title="Protocolo — Enfermedad"
                  subtitle="Lineal"
                  modalIcon={<span aria-hidden>💊</span>}
                  onOpen={() => marcarProtocolo("enfermedad")}
                >
                  <ProtocoloEnfermedad />
                </ProtocolLauncher>
              </div>

              {/* ⚠️ INSEGURIDAD */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.inseguridad}
                  readOnly
                  className="mt-4 accent-yellow-600"
                />

                <ProtocolLauncher
                  label="Inseguridad"
                  icon="⚠️"
                  variant="outline"
                  title="Protocolo — Inseguridad"
                  subtitle="Riesgo directo"
                  modalIcon={<span aria-hidden>⚠️</span>}
                  onOpen={() => marcarProtocolo("inseguridad")}
                >
                  <InseguridadSinRiesgo />
                </ProtocolLauncher>
              </div>

              {/* 🛑 UNIDAD DETENIDA */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.detenida}
                  readOnly
                  className="mt-4 accent-orange-600"
                />

                <ProtocolLauncher
                  label="Unidad detenida"
                  icon="🛑"
                  variant="outline"
                  title="Protocolo — Unidad detenida"
                  subtitle="Flujo guiado"
                  modalIcon={<span aria-hidden>🛑</span>}
                  onOpen={() => marcarProtocolo("detenida")}
                >
                  <UnidadDetenida />
                </ProtocolLauncher>
              </div>

              {/* 📡 SIN SEÑAL */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={protocolosEjecutados.sinSenal}
                  readOnly
                  className="mt-4 accent-cyan-600"
                />

                <ProtocolLauncher
                  label="Sin señal"
                  icon="📡"
                  variant="outline"
                  title="Protocolo — Unidad sin señal"
                  subtitle="Lineal interactivo"
                  modalIcon={<span aria-hidden>📡</span>}
                  onOpen={() => marcarProtocolo("sinSenal")}
                >
                  <UnidadSinSenal />
                </ProtocolLauncher>
              </div>
            </div>

            {/* 📝 NOTA DE CIERRE CASO CRÍTICO */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Descripción de cierre del caso crítico{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                value={detalleCierre}
                onChange={(e) => setDetalleCierre(e.target.value)}
                rows={4}
                placeholder="Describe las acciones realizadas y el motivo del cierre del caso (mínimo 50 caracteres)"
                className="w-full bg-white text-black border border-gray-300 rounded-md p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />

              <div className="text-[10px] text-gray-500 mt-1">
                {detalleCierre.length} / 50 caracteres
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  resetearProtocolos();
                  setDetalleCierre("");
                  setCasoCriticoSeleccionado(null);
                }}
                className="text-xs bg-gray-300 px-4 py-1 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  // 🚫 Validación fuerte
                  // 🚫 0) VALIDAR PROTOCOLOS EJECUTADOS
                  if (!hayAlMenosUnProtocoloEjecutado()) {
                    toast.error(
                      "Debes ejecutar al menos un protocolo antes de cerrar el caso"
                    );
                    return;
                  }

                  // 🚫 1) VALIDACIÓN DE DESCRIPCIÓN
                  if (!detalleCierre || detalleCierre.trim().length < 50) {
                    toast.error(
                      "La descripción debe tener al menos 50 caracteres"
                    );
                    return;
                  }

                  const confirmar = window.confirm(
                    "¿Confirmas el cierre del caso crítico? Esta acción cerrará todas las alertas asociadas."
                  );

                  if (!confirmar) return;

                  try {
                    const resp = await fetch(
                      `${API_URL}/alertas/cerrar-multiples`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          alertas: casoCriticoSeleccionado.eventos.map(
                            (e) => e.id
                          ),
                          id_usuario: usuario.id,
                          nombre_usuario: usuario.name,
                          detalle_cierre: detalleCierre, // ✅ MISMA NOTA PARA TODAS
                        }),
                      }
                    );

                    if (!resp.ok) {
                      const errorText = await resp.text();
                      throw new Error(errorText);
                    }

                    // 🧹 quitar el caso completo de la UI
                    cerrarModalYEliminarCaso(casoCriticoSeleccionado.id);

                    toast.success("✅ Caso crítico cerrado correctamente");
                  } catch (error) {
                    console.error("❌ Error cerrando caso crítico:", error);
                    toast.error("No se pudo cerrar el caso crítico");
                  }
                }}
                disabled={detalleCierre.trim().length < 50}
                className={`text-xs px-4 py-1 rounded text-white
    ${
      detalleCierre.trim().length < 50
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
          <div className="bg-white rounded-lg w-[500px] max-w-full p-5 shadow-xl">
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
            {/* 📝 NOTA DE CIERRE */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nota de cierre <span className="text-red-500">*</span>
              </label>

              <textarea
                value={detalleCierre}
                onChange={(e) => setDetalleCierre(e.target.value)}
                rows={4}
                placeholder="Describe detalladamente el motivo del cierre (mínimo 50 caracteres)"
                className="
    w-full
    bg-white text-black
    border border-gray-300
    rounded-md
    p-2
    text-xs
    resize-none
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
  "
              />

              <div className="text-[10px] text-gray-500 mt-1">
                {detalleCierre.length} / 50 caracteres
              </div>
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
                  if (!detalleCierre || detalleCierre.trim().length < 50) {
                    toast.error(
                      "La nota de cierre debe tener al menos 50 caracteres"
                    );
                    return;
                  }

                  const confirmar = window.confirm(
                    "¿Te gustaría cambiar el estado de esta alerta?"
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
                    cerrarModalYEliminarCaso(casoSeleccionado.id);
                    toast.success(
                      `La alerta ${casoSeleccionado.eventos[0].tipo} fue cerrada correctamente`
                    );
                  } catch (error) {
                    console.error("❌ Error cerrando alerta:", error);
                    toast.error(
                      "No se pudo cerrar la alerta. Intenta nuevamente."
                    );
                  }
                }}
                disabled={detalleCierre.trim().length < 50}
                className={`text-xs px-3 py-1 rounded text-white
    ${
      detalleCierre.trim().length < 50
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
      <div className="bg-white rounded-xl shadow p-4 h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-xl font-semibold">⚡ Alertas</h2>
          <div className="mb-3 p-3 rounded-md bg-gray-200 text-xs text-gray-800">
            <div>
              Total recibidas: <strong>{totalAlertas}</strong>
            </div>
            <div>
              Del usuario: <strong>{alertasFiltradas}</strong>
            </div>
            <div>
              Procesadas:{" "}
              <strong>
                {alertasProcesadas} / {alertasFiltradas}
              </strong>
            </div>

            {!cargaTerminada ? (
              <div className="mt-1 text-yellow-700 font-semibold">
                ⏳ Cargando alertas…
              </div>
            ) : (
              <div className="mt-1 text-green-700 font-semibold">
                ✅ Alertas listas
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {activos.map((c) => {
            const ultimoEvento = c.eventos[0];
            const slta = ultimoEvento?.geocercaSLTA;
            const panico = esPanico(c);
            const SLTA_LABEL = {
              S: "Sucursal",
              L: "Local",
              T: "Taller",
              A: "Agencia",
            };
            const zonas = extraerZonas(c.eventos[0]?.geocercas_json);
            return (
              <div
                key={c.id}
                className={`mb-3 p-4 rounded-lg border transition-all
    ${
      panico
        ? "bg-red-50 border-red-400 border-l-8 border-l-red-600"
        : slta
        ? "bg-green-50 border-green-400 border-l-8 border-l-green-700"
        : "bg-white border-gray-300"
    }
  `}
              >
                {c.eventos[0]?.geocercas_detectadas?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.eventos[0].geocercas_detectadas.map((z, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full
        bg-blue-700 text-white text-[10px] font-semibold"
                      >
                        📍 {z.name}aaa
                      </span>
                    ))}
                  </div>
                )}

                {/* BADGE SLTA */}
                {slta && (
                  <div className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-700 text-white text-[11px] font-bold">
                    🔐 Zona SLTA · {SLTA_LABEL[slta]}
                  </div>
                )}
                {zonas.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {zonas.map((z) => (
                      <span
                        key={z.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full
                   bg-blue-600 text-white text-[10px] font-semibold"
                      >
                        📍 {z.name}
                      </span>
                    ))}
                  </div>
                )}
                {panico && (
                  <div
                    className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full
    bg-red-600 text-white text-[11px] font-bold"
                  >
                    🚨 ALERTA DE PÁNICO
                  </div>
                )}
                {/* HEADER */}
                <div
                  onClick={() =>
                    setCasos((p) => ({
                      ...p,
                      [c.id]: { ...c, expanded: !c.expanded },
                    }))
                  }
                  className="cursor-pointer flex justify-between items-center"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-500">
                      Estado del caso: <strong>{c.estado}</strong>
                    </div>

                    <div className="font-bold truncate text-green-800">
                      {c.unidad}
                    </div>

                    <div className="text-sm text-gray-600 truncate">
                      {resumenReps(c.repeticiones)}
                    </div>
                  </div>

                  {c.expanded ? <ChevronUp /> : <ChevronDown />}
                </div>

                {/* DETALLE */}
                {c.expanded && (
                  <div className="mt-3 border-t pt-3 text-xs space-y-3">
                    {c.eventos.map((e, i) => (
                      <div key={`${e.id ?? "noid"}-${i}`} className="pt-2">
                        {/* título tipo */}
                        <strong className="text-gray-900">
                          {normalize(e.tipo)}
                        </strong>

                        {/* ID alerta */}
                        <div className="text-[11px] text-gray-500 mt-1">
                          ID alerta: {e.id ?? "—"}
                        </div>

                        {/* Info extra (fecha/hora, lugar, velocidad) */}
                        <div className="space-y-1 text-[11px] text-gray-700 mt-2">
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

                        {/* Mensaje completo */}
                        <MensajeExpandable mensaje={e.mensaje} />

                        <div className="flex w-full gap-3 items-center justify-between">
                          {/* Maps */}
                          {extraerMapsUrl(e.mensaje) && (
                            <a
                              href={extraerMapsUrl(e.mensaje)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 text-[11px] text-sm font-bold bg-black  px-3 py-3 h-12 text-white rounded font-bold"
                            >
                              Google Maps
                            </a>
                          )}

                          {/* Botón analizar */}
                          <button
                            onClick={() => setCasoSeleccionado(c)}
                            className="mt-2 bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded h-12 text-sm font-bold"
                          >
                            Analizar caso
                          </button>
                          <button
                            onClick={async () => {
                              console.log("📞 BOTÓN LLAMAR PRESIONADO");
                              try {
                                const resp = await fetch(
                                  "https://apipx.onrender.com/iaVoice/llamar",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      telefono: "+526681515406",
                                      contexto: e,
                                    }),
                                  }
                                );

                                console.log("📡 RESPUESTA HTTP:", resp.status);

                                const data = await resp.json();
                                console.log("📦 DATA:", data);
                              } catch (e) {
                                console.error("❌ ERROR FETCH:", e);
                              }
                            }}
                          >
                            📞 Llamar operador
                          </button>

                          <button
                            onClick={() => {
                              console.log("VER EN MAPA:", c);
                              if (!c.unitId) {
                                toast.error(
                                  "No se pudo identificar la unidad en el mapa"
                                );
                                return;
                              }

                              setMapaUnidad({
                                unitId: c.unitId,
                                unidad: c.unidad,
                                alerta: c.eventos[0], // 👈 ALERTA ACTIVA
                              });
                            }}
                            className="mt-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded h-12"
                          >
                            🗺 Ver ubicación en tiempo real
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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
          <h2 className="text-xl font-semibold text-red-700">
            🔥 Alertas Críticas
          </h2>
          <button
            onClick={() => {
              // limpia SOLO críticos (deja activos)
              setCasos((prev) => {
                const out = {};
                for (const [k, v] of Object.entries(prev)) {
                  if (!v.critico) out[k] = v;
                }
                return out;
              });
            }}
            className="text-xs bg-red-600 text-white px-3 py-1 rounded flex gap-1 items-center"
          >
            <Trash2 size={14} /> Borrar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {criticos.map((c) => {
            const ultimoEvento = c.eventos[0];
            const slta = ultimoEvento?.geocercaSLTA;
            const panico = esPanico(c);
            const SLTA_LABEL = {
              S: "Sucursal",
              L: "Local",
              T: "Taller",
              A: "Agencia",
            };
            const zonas = extraerZonas(c.eventos[0]?.geocercas_json);
            return (
              <div
                key={c.id}
                className={`mb-3 p-4 rounded-lg border transition-all
    ${
      panico
        ? "bg-red-50 border-red-500 border-l-8 border-l-red-700 "
        : slta
        ? "bg-green-50 border-green-400 border-l-8 border-l-green-700"
        : "bg-white border-gray-300"
    }
  `}
              >
                {/* BADGE SLTA */}
                {slta && (
                  <div className="mb-1 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-700 text-white text-[11px] font-bold">
                    🔐 Zona segura · {SLTA_LABEL[slta]}
                  </div>
                )}
                {zonas.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {zonas.map((z) => (
                      <span
                        key={z.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full
                   bg-blue-600 text-white text-[10px] font-semibold"
                      >
                        📍 {z.name}
                      </span>
                    ))}
                  </div>
                )}
                {panico && (
                  <div
                    className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full
    bg-red-700 text-white text-[11px] font-bold "
                  >
                    🚨 ALERTA DE PÁNICO
                  </div>
                )}
                {/* UNIDAD */}
                <div
                  className={`font-bold ${
                    slta ? "text-purple-800" : "text-red-700"
                  }`}
                >
                  {c.unidad}
                </div>

                {/* COMBINACIÓN / REPETICIÓN */}
                <div
                  className={`text-sm mt-1 ${
                    slta ? "text-purple-700" : "text-red-600"
                  }`}
                >
                  {c.combinacion
                    ? c.combinacion
                    : `REPETIDO: ${Object.entries(c.repeticiones)
                        .filter(([, n]) => n >= 2)
                        .map(([t, n]) => `${t} (${n})`)
                        .join(" • ")}`}
                </div>

                {/* DATOS CONTEXTUALES */}
                <div className="space-y-1 text-[11px] text-gray-700 mt-2">
                  {ultimoEvento?.tsInc && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Fecha:</strong>{" "}
                        {formatearFechaHoraCritica(ultimoEvento.tsInc).fecha}
                      </div>

                      <div>
                        <strong>Hora:</strong>{" "}
                        {formatearFechaHoraCritica(ultimoEvento.tsInc).hora}
                      </div>
                    </div>
                  )}

                  {extraerLugar(ultimoEvento?.mensaje) && (
                    <div>
                      <strong>Lugar:</strong>{" "}
                      {extraerLugar(ultimoEvento.mensaje)}
                    </div>
                  )}

                  {extraerVelocidad(ultimoEvento?.mensaje) && (
                    <div>
                      <strong>Velocidad:</strong>{" "}
                      {extraerVelocidad(ultimoEvento.mensaje)}
                    </div>
                  )}
                </div>

                {/* MENSAJE */}
                {ultimoEvento?.mensaje && (
                  <>
                    <div className="text-xs mt-2 whitespace-pre-wrap text-gray-800">
                      <MensajeExpandable mensaje={ultimoEvento.mensaje} />
                    </div>

                    {extraerMapsUrl(ultimoEvento.mensaje) && (
                      <a
                        href={extraerMapsUrl(ultimoEvento.mensaje)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-[11px] mt-1 inline-block"
                      >
                        Ver ubicación en Google Maps
                      </a>
                    )}
                  </>
                )}

                {/* ID ALERTA */}
                <div className="text-[11px] text-gray-600 mt-2">
                  ID alerta más reciente: {ultimoEvento?.id ?? "—"}
                </div>

                {/* BOTÓN PROTOCOLO */}
                <button
                  onClick={() => setCasoCriticoSeleccionado(c)}
                  className={`mt-3 text-xs text-white px-3 py-1 rounded flex gap-1 items-center
          ${
            slta
              ? "bg-purple-700 hover:bg-purple-800"
              : "bg-red-600 hover:bg-red-700"
          }
        `}
                >
                  <ShieldAlert size={14} /> Protocolo
                </button>
              </div>
            );
          })}

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
          <div className="bg-white rounded-xl w-[900px] h-[600px] shadow-2xl relative">
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
