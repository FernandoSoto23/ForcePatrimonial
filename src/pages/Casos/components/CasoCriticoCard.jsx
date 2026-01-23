import React from "react";
import { ShieldAlert, ChevronDown } from "lucide-react";

function CasoCriticoCard({
    caso,
    isSelected,
    onProtocolo,
    onMapa,
    onLlamarOperador,
    esPanico,
    formatearFechaHoraCritica,
    MensajeExpandable,
}) {
    const ultimoEvento = caso.eventos[0];
    const panico = esPanico(caso);

    return (
        <div
            className={`
    mb-1 rounded-md border shadow-sm transition
    ${isSelected
                    ? "bg-gray-200 border-gray-500 ring-2 ring-gray-400"
                    : panico
                        ? "bg-red-50 border-red-500"
                        : "bg-white border-red-300"
                }
  `}
        >
            {/* FILA PRINCIPAL */}
            <div className="grid grid-cols-[1.6fr_1.4fr_auto_auto] items-center gap-4 px-3 py-2">
                {/* UNIDAD + TIPOS */}
                <div className="min-w-0">
                    <div className="font-extrabold text-[13px] text-gray-900 truncate">
                        {caso.unidad}
                    </div>

                    <div className="text-[11px] text-red-700 font-semibold truncate">
                        {caso.combinacion}
                    </div>
                </div>

                {/* FECHA / HORA / ID */}
                <div className="text-[11px] text-gray-900 leading-tight">
                    {ultimoEvento?.tsInc && (
                        <div>
                            {formatearFechaHoraCritica(ultimoEvento.tsInc).fecha} ·{" "}
                            {formatearFechaHoraCritica(ultimoEvento.tsInc).hora}
                        </div>
                    )}
                    <div className="text-gray-500">
                        ID: {ultimoEvento?.id ?? "—"}
                    </div>
                </div>

                {/* ACCIONES (ESTANDARIZADAS) */}
                <div className="flex gap-1">
                    <button
                        title="Llamar operador"
                        onClick={() => onLlamarOperador(ultimoEvento)}
                        className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                        📞
                    </button>

                    <button
                        title="Ver ubicación en tiempo real"
                        onClick={() => onMapa(caso)}
                        className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                        🗺
                    </button>

                    <button
                        title="Iniciar protocolo"
                        onClick={() => onProtocolo(caso)}
                        className="px-3 py-1 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                    >
                        <ShieldAlert size={14} />
                        Protocolo
                    </button>
                </div>

                {/* INDICADOR VISUAL */}
                <div title="Caso crítico" className="text-red-500">
                    <ChevronDown size={14} />
                </div>
            </div>

            {/* MENSAJE (COMPACTO, NO PROTAGONISTA) */}
            {ultimoEvento?.mensaje && (
                <div className="px-4 pb-2 text-[11px] text-gray-700">
                    <MensajeExpandable mensaje={ultimoEvento.mensaje} />
                </div>
            )}
        </div>
    );
}

export default React.memo(CasoCriticoCard);
