import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
function CasoActivoCard({
    caso,
    isSelected,
    onToggle,
    onAnalizar,
    onMapa,
    onLlamarOperador,
    resumenReps,
    MensajeExpandable,
}) {
    const ultimoEvento = caso.eventos[0];
    const slta = ultimoEvento?.geocercaSLTA;
    const panico = caso.esPanico;
    const zonas = caso.zonas;

    const SLTA_LABEL = {
        S: "Sucursal",
        L: "Local",
        T: "Taller",
        A: "Agencia",
    };

    return (
        <div
            className={`mb-3 p-4 rounded-lg border transition-all
${isSelected
                    ? "bg-gray-200 border-gray-500 border-l-8 border-l-gray-600 shadow-inner"
                    : panico
                        ? "bg-red-50 border-red-400 border-l-8 border-l-red-600"
                        : slta
                            ? "bg-green-50 border-green-400 border-l-8 border-l-green-700"
                            : "bg-white border-gray-300"
                }`}
        >
            {/* BADGE SLTA */}
            {slta && (
                <div className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-700 text-white text-[11px] font-bold">
                    {SLTA_LABEL[slta]}
                </div>
            )}

            {/* ZONAS */}
            {zonas?.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                    {zonas.map((z) => (
                        <span
                            key={z.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold"
                        >
                            📍 {z.name}
                        </span>
                    ))}
                </div>
            )}

            {/* PÁNICO */}
            {panico && (
                <div className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold">
                    🚨 ALERTA DE PÁNICO
                </div>
            )}

            {/* HEADER */}
            <div
                onClick={() => onToggle(caso)}
                className="cursor-pointer flex justify-between items-center"
            >
                <div className="min-w-0">
                    <div className="text-[11px] text-gray-500">
                        Estado del caso: <strong>{caso.estado}</strong>
                    </div>

                    <div className="font-bold truncate text-green-800">
                        {caso.unidad}
                    </div>

                    <div className="text-sm text-gray-600 truncate">
                        {resumenReps(caso.repeticiones)}
                    </div>
                </div>

                {caso.expanded ? <ChevronUp /> : <ChevronDown />}
            </div>

            {/* DETALLE */}
            {caso.expanded && (
                <div className="mt-3 border-t pt-3 text-xs space-y-3">
                    {caso.eventos.map((e, i) => (
                        <div key={`${e.id ?? "noid"}-${i}`} className="pt-2">
                            <strong>{e.tipoNorm}</strong>
                            <div className="text-[11px] text-gray-500 mt-1">
                                ID alerta: {e.id ?? "—"}
                            </div>

                            <div className="space-y-1 text-[11px] text-gray-700 mt-2">
                                {e.fechaHoraFmt && (
                                    <>
                                        <div><strong>Fecha:</strong> {e.fechaHoraFmt.fecha}</div>
                                        <div><strong>Hora:</strong> {e.fechaHoraFmt.hora}</div>
                                    </>
                                )}

                                {e.lugar && (
                                    <div><strong>Lugar:</strong> {e.lugar}</div>
                                )}

                                {e.velocidad && (
                                    <div><strong>Velocidad:</strong> {e.velocidad}</div>
                                )}
                            </div>

                            <MensajeExpandable mensaje={e.mensaje} />

                            {/* BOTONES */}
                            <div className="flex w-full gap-3 items-center justify-between">
                                {e.mapsUrl && (
                                    <a
                                        href={e.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 text-[11px] font-bold bg-black px-3 py-3 h-12 text-white rounded"
                                    >
                                        Google Maps
                                    </a>
                                )}

                                <button
                                    onClick={() => onAnalizar(caso)}
                                    className="mt-2 bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded h-12 text-sm font-bold"
                                >
                                    Analizar caso
                                </button>

                                <button
                                    onClick={() => onLlamarOperador(e)}
                                    className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded h-12 text-sm font-bold"
                                >
                                    📞 Llamar operador
                                </button>

                                <button
                                    onClick={() => onMapa(caso)}
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
}

export default React.memo(CasoActivoCard);
