import { memo } from "react";
import { ShieldAlert } from "lucide-react";
import MensajeExpandable from "./MensajeExpandible";

const CriticoCard = memo(function CriticoCard({
  caso,
  onProtocolo,
  normalize,
  formatearFechaHoraCritica,
  extraerLugar,
  extraerVelocidad,
  extraerMapsUrl,
}) {
  const ultimoEvento = caso.eventos[0];
  const slta = ultimoEvento?.geocercaSLTA;
  const zonas = ultimoEvento?.geocercas_detectadas || [];

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
            critico: true,
          })
        );
      }}
      className="
        cursor-move
        mb-2
        p-2
        rounded-lg
        border
        shadow-sm
        hover:shadow-md
        transition
      "
    >
      {/* BADGE SLTA */}
      {slta && (
        <div className="mb-1 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-700 text-white text-[11px] font-bold">
          🔐 Zona segura
        </div>
      )}

      {/* UNIDAD */}
      <div className="font-bold text-red-700">{caso.unidad}</div>

      {/* COMBINACIÓN */}
      <div className="text-sm mt-1 text-red-600">
        {caso.combinacion ||
          `REPETIDO: ${Object.entries(caso.repeticiones)
            .filter(([, n]) => n >= 2)
            .map(([t, n]) => `${t} (${n})`)
            .join(" • ")}`}
      </div>

      {/* FECHA / HORA */}
      {ultimoEvento?.tsInc && (
        <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
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

      {/* LUGAR / VELOCIDAD */}
      <div className="space-y-1 text-[11px] text-gray-700 mt-2">
        {extraerLugar(ultimoEvento?.mensaje) && (
          <div>
            <strong>Lugar:</strong> {extraerLugar(ultimoEvento.mensaje)}
          </div>
        )}

        {extraerVelocidad(ultimoEvento?.mensaje) && (
          <div>
            <strong>Velocidad:</strong> {extraerVelocidad(ultimoEvento.mensaje)}
          </div>
        )}
      </div>

      {/* MENSAJE */}
      <div className="mt-2">
        <MensajeExpandable mensaje={ultimoEvento.mensaje} />
      </div>

      {/* MAPS */}
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

      {/* BOTÓN PROTOCOLO */}
      <button
        onClick={() => onProtocolo(caso)}
        className="mt-3 text-xs text-white px-3 py-1 rounded flex gap-1 items-center bg-red-600 hover:bg-red-700"
      >
        <ShieldAlert size={14} /> Protocolo
      </button>
    </div>
  );
});

export default CriticoCard;
