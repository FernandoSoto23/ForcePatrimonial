import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import MensajeExpandable from "./MensajeExpandible";

const ActivoCard = memo(function ActivoCard({
  caso,
  onToggle,
  onAnalizar,
  onMapa,
  resumenReps,
  esPanico,
  normalize,
  extraerLugar,
  extraerVelocidad,
  extraerMapsUrl,
  formatearFechaHora,
}) {
  const c = caso;
  const ultimoEvento = c.eventos[0];
  const panico = esPanico(c);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({
            unitId: caso.unitId,
            unidad: caso.unidad,
            alerta: caso.eventos[0],
          })
        );
      }}
      className="
        cursor-move
        mb-2
        p-2
        rounded-lg
        border
        bg-white
        shadow-sm
        hover:shadow-md
        transition
      "
    >
      {/* HEADER */}
      <div
        onClick={() => onToggle(c)}
        className="cursor-pointer flex justify-between items-center"
      >
        <div className="min-w-0">
          <div className="text-[11px] text-gray-500">
            Estado: <strong>{c.estado}</strong>
          </div>

          <div className="font-bold truncate text-green-800">{c.unidad}</div>

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
            <div key={i}>
              <strong>{normalize(e.tipo)}</strong>

              <MensajeExpandable mensaje={e.mensaje} />

              <div className="flex gap-2 mt-2">
                {extraerMapsUrl(e.mensaje) && (
                  <a
                    href={extraerMapsUrl(e.mensaje)}
                    target="_blank"
                    className="text-xs bg-black text-white px-2 py-1 rounded"
                  >
                    Google Maps
                  </a>
                )}

                <button
                  onClick={() => onAnalizar(c)}
                  className="bg-green-700 text-white px-2 py-1 rounded text-xs"
                >
                  Analizar
                </button>

                <button
                  onClick={() => onMapa(c)}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  Ver mapa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ActivoCard;
