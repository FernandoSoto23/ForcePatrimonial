import React from "react";
import { ShieldAlert } from "lucide-react";

function CasoCriticoCard({
    caso,
    isSelected,
    hayCriticoFijo,   // 👈 NUEVO
    onProtocolo,
    onAnalizar,
    onMapa,
    onLlamarOperador,
    esPanico,
    extraerZonas,
    formatearFechaHoraCritica,
    extraerLugar,
    extraerVelocidad,
    extraerMapsUrl,
    MensajeExpandable,
}) {
    const ultimoEvento = caso.eventos[0];
    const slta = ultimoEvento?.geocercaSLTA;
    const panico = esPanico(caso);
    const zonas = extraerZonas(ultimoEvento?.geocercas_json);

    const SLTA_LABEL = { S: "Sucursal", L: "Local", T: "Taller", A: "Agencia" };

    return (
        <div
            className={`mb-3 p-4 rounded-lg border transition-none
${isSelected
                    ? "bg-gray-200 border-gray-700 border-l-8 border-l-gray-800 shadow-lg ring-2 ring-gray-400"
                    : panico
                        ? "bg-red-50 border-red-500 border-l-8 border-l-red-700"
                        : slta
                            ? "bg-green-50 border-green-400 border-l-8 border-l-green-700"
                            : "bg-white border-gray-300"
                }`}
        >

            {slta && (
                <div className="mb-1 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-700 text-white text-[11px] font-bold">
                    🔐 Zona segura · {SLTA_LABEL[slta]}
                </div>
            )}

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

            {panico && (
                <div className="mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-700 text-white text-[11px] font-bold">
                    🚨 ALERTA DE PÁNICO
                </div>
            )}

            <div className={`font-bold ${slta ? "text-purple-800" : "text-red-700"}`}>
                {caso.unidad}
            </div>

            {Object.values(caso.repeticiones).some((n) => n >= 2) && (
                <div className="text-sm mt-1 text-red-700 font-semibold">
                    REPETIDO:&nbsp;
                    {Object.entries(caso.repeticiones)
                        .filter(([, n]) => n >= 2)
                        .map(([t, n]) => `${t} (${n})`)
                        .join(" · ")}
                </div>
            )}

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
                        <strong>Lugar:</strong> {extraerLugar(ultimoEvento.mensaje)}
                    </div>
                )}

                {extraerVelocidad(ultimoEvento?.mensaje) && (
                    <div>
                        <strong>Velocidad:</strong>{" "}
                        {extraerVelocidad(ultimoEvento.mensaje)}
                    </div>
                )}
            </div>

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

            <div className="text-[11px] text-gray-600 mt-2">
                ID alerta más reciente: {ultimoEvento?.id ?? "—"}
            </div>

            {/* 🔥 ACCIONES */}
            <div className="mt-3 flex flex-wrap gap-2">
                {/* 📞 LLAMAR OPERADOR */}
                <button
                    onClick={() => onLlamarOperador(ultimoEvento)}
                    className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                    Llamar operador
                </button>
                {/* 📞 LLAMADA HUMANA */}
                <button
                    onClick={() => onLlamarOperador(ultimoEvento, { modo: "humano" })}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                    📞 Llamada directa
                </button>
                {/* 🗺 UBICACIÓN */}
                <button
                    onClick={() => onMapa(caso)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                    Ver ubicación en tiempo real
                </button>

                {/* 🚨 PROTOCOLO */}
                <button
                    onClick={() => onProtocolo(caso)}
                    className={`text-xs text-white px-3 py-1 rounded flex gap-1 items-center
            ${slta
                            ? "bg-purple-700 hover:bg-purple-800"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                >
                    <ShieldAlert size={14} /> Protocolo
                </button>
            </div>
        </div>
    );
}

export default React.memo(CasoCriticoCard);
