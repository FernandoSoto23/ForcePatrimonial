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
  const panico = caso.esPanico;

  return (
    <div
      className={`
        mb-1 rounded-md border transition shadow-sm bg-white
        ${panico ? "border-red-400" : "border-gray-300"}
        ${isSelected ? "ring-1 ring-gray-400" : ""}
      `}
    >
      {/* FILA PRINCIPAL */}
      <div className="grid grid-cols-[1.6fr_1.4fr_auto_auto] items-center gap-4 px-3 py-2">
        {/* UNIDAD + TIPO */}
        <div className="min-w-0">
          <div className="font-extrabold text-[13px] text-gray-900 truncate">
            {caso.unidad}
          </div>

          <div className="text-[11px] text-gray-600 truncate">
            {resumenReps(caso.repeticiones)}
          </div>
        </div>

        {/* FECHA / HORA / ID */}
        <div className="text-[11px] text-gray-800 leading-tight">
          {ultimoEvento?.fechaHoraFmt && (
            <div>
              {ultimoEvento.fechaHoraFmt.fecha} ·{" "}
              {ultimoEvento.fechaHoraFmt.hora}
            </div>
          )}
          {ultimoEvento?.id && (
            <div className="text-gray-500">ID: {ultimoEvento.id}</div>
          )}
        </div>

        {/* ACCIONES */}
        <div className="flex gap-1">
          <button
            title="Analizar caso"
            onClick={() => onAnalizar(caso)}
            className="px-3 py-1 text-[11px] rounded bg-black text-white hover:bg-gray-900"
          >
            Analizar
          </button>

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
        </div>

        {/* EXPAND */}
        <div
          title={caso.expanded ? "Ocultar detalle del caso" : "Ver detalle del caso"}
          onClick={() => onToggle(caso)}
          className="cursor-pointer text-gray-400 hover:text-gray-600"
        >
          {caso.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* EXPANDIDO */}
      {caso.expanded && (
        <div className="px-4 py-2 border-t bg-gray-50 text-[11px] space-y-2">
          {caso.eventos.map((e, i) => (
            <div key={`${e.id}-${i}`}>
              <strong className="text-gray-900">{e.tipoNorm}</strong>
              <MensajeExpandable mensaje={e.mensaje} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(CasoActivoCard);
