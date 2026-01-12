import React, { useMemo, useCallback } from "react";

export default function CasoCriticoModal({
  caso,
  onClose,
  protocolosEjecutados,
  marcarProtocolo,
  detalleCierre,
  setDetalleCierre,
  hayAlMenosUnProtocoloEjecutado,
  resetearProtocolos,
  cerrarModalYEliminarCaso,
  usuario,
  API_URL,
  toast,

  // helpers + UI components que ya tienes
  normalize,
  formatearFechaHora,
  extraerLugar,
  extraerVelocidad,
  extraerMapsUrl,
  MensajeExpandable,
  ProtocolLauncher,
  ProtocoloAsaltoUnidadUI,
  FlowRunnerBotonPanico,
  ProtocoloDesvioRutaNoAutorizadoUI,
  ProtocoloEnfermedad,
  InseguridadSinRiesgo,
  UnidadDetenida,
  UnidadSinSenal,
}) {
  const eventos = caso?.eventos ?? [];

  // ✅ evita recalcular el map y helpers en cada render del modal
  const eventosProcesados = useMemo(() => {
    return eventos.map((e) => {
      const fh = formatearFechaHora(e.mensaje);
      return {
        ...e,
        _fh: fh,
        _lugar: extraerLugar(e.mensaje),
        _vel: extraerVelocidad(e.mensaje),
        _maps: extraerMapsUrl(e.mensaje),
      };
    });
  }, [eventos, formatearFechaHora, extraerLugar, extraerVelocidad, extraerMapsUrl]);

  const cerrar = useCallback(() => {
    resetearProtocolos();
    setDetalleCierre("");
    onClose();
  }, [resetearProtocolos, setDetalleCierre, onClose]);

  if (!caso) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-white rounded-xl w-full max-w-[1000px] p-4 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              Caso crítico
            </div>
            <div className="text-[11px] sm:text-xs text-gray-600">
              {caso.unidad ?? "—"}
            </div>
          </div>

          <button
            onClick={cerrar}
            className="text-gray-500 hover:text-black text-lg leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* INFO GENERAL */}
        <div className="text-[11px] sm:text-xs text-gray-700 space-y-1 mb-4">
          <div>
            <strong>Tipos involucrados:</strong> {caso.combinacion}
          </div>
          <div>
            <strong>Total de alertas:</strong> {eventos.length}
          </div>
        </div>

        {/* HISTORIAL DETALLADO */}
        <div className="border rounded-md p-3 max-h-72 overflow-auto text-[11px] sm:text-xs space-y-3">
          {eventosProcesados.map((e, i) => (
            <div key={`${e.id ?? "noid"}-${i}`} className="border-b last:border-b-0 pb-3">
              <div className="flex justify-between items-center mb-1">
                <strong className="text-red-700">{normalize(e.tipo)}</strong>
                <span className="text-[10px] sm:text-[11px] text-gray-500">
                  ID #{e.id}
                </span>
              </div>

              <div className="space-y-1 text-[10px] sm:text-[11px] text-gray-700 ml-1">
                {e._fh && (
                  <>
                    <div>
                      <strong>Fecha:</strong> {e._fh.fecha}
                    </div>
                    <div>
                      <strong>Hora:</strong> {e._fh.hora}
                    </div>
                  </>
                )}

                {e._lugar && (
                  <div>
                    <strong>Lugar:</strong> {e._lugar}
                  </div>
                )}

                {e._vel && (
                  <div>
                    <strong>Velocidad:</strong> {e._vel}
                  </div>
                )}
              </div>

              <MensajeExpandable mensaje={e.mensaje} />

              {e._maps && (
                <a
                  href={e._maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[10px] sm:text-[11px] text-blue-600 underline"
                >
                  Ver ubicación en Google Maps
                </a>
              )}
            </div>
          ))}
        </div>

        {/* ACCIONES DEL PROTOCOLO */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          <ItemCheck checked={protocolosEjecutados.asalto} color="accent-green-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.panico} color="accent-red-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.desvio} color="accent-indigo-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.enfermedad} color="accent-purple-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.inseguridad} color="accent-yellow-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.detenida} color="accent-orange-600">
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
          </ItemCheck>

          <ItemCheck checked={protocolosEjecutados.sinSenal} color="accent-cyan-600">
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
          </ItemCheck>
        </div>

        {/* NOTA DE CIERRE */}
        <div className="mt-4">
          <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
            Descripción de cierre del caso crítico <span className="text-red-500">*</span>
          </label>

          <textarea
            value={detalleCierre}
            onChange={(e) => setDetalleCierre(e.target.value)}
            rows={4}
            placeholder="Describe las acciones realizadas y el motivo del cierre del caso (mínimo 50 caracteres)"
            className="w-full bg-white text-black border border-gray-300 rounded-md p-2 text-[11px] sm:text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <div className="text-[10px] text-gray-500 mt-1">
            {detalleCierre.length} / 50 caracteres
          </div>
        </div>

        {/* BOTONES */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button onClick={cerrar} className="text-xs bg-gray-300 px-4 py-2 sm:py-1 rounded">
            Cancelar
          </button>

          <button
            onClick={async () => {
              if (!hayAlMenosUnProtocoloEjecutado()) {
                toast.error("Debes ejecutar al menos un protocolo antes de cerrar el caso");
                return;
              }
              if (!detalleCierre || detalleCierre.trim().length < 50) {
                toast.error("La descripción debe tener al menos 50 caracteres");
                return;
              }

              const confirmar = window.confirm(
                "¿Confirmas el cierre del caso crítico? Esta acción cerrará todas las alertas asociadas."
              );
              if (!confirmar) return;

              try {
                const resp = await fetch(`${API_URL}/alertas/cerrar-multiples`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    alertas: caso.eventos.map((e) => e.id),
                    id_usuario: usuario.id,
                    nombre_usuario: usuario.name,
                    detalle_cierre: detalleCierre,
                  }),
                });

                if (!resp.ok) {
                  const errorText = await resp.text();
                  throw new Error(errorText);
                }

                cerrarModalYEliminarCaso(caso.id);
                toast.success("✅ Caso crítico cerrado correctamente");
                cerrar();
              } catch (error) {
                console.error("❌ Error cerrando caso crítico:", error);
                toast.error("No se pudo cerrar el caso crítico");
              }
            }}
            disabled={detalleCierre.trim().length < 50}
            className={`text-xs px-4 py-2 sm:py-1 rounded text-white
              ${
                detalleCierre.trim().length < 50
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
          >
            Cerrar caso crítico
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemCheck({ checked, color, children }) {
  return (
    <div className="flex items-start gap-3">
      <input type="checkbox" checked={checked} readOnly className={`mt-3 ${color}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
