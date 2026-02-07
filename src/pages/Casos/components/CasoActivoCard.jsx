import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import { getCodigoAgente } from "../../../utils/codigoAgente";
function CasoActivoCard({
  caso,
  isSelected,
  onToggle,
  onAnalizar,
  onMapa,
  onLlamarOperador,
  resumenReps,
  MensajeExpandable,
  onLlamarCabina,
  codigoAgente,
}) {
  const SLTA_LABEL = {
    S: "Sucursal",
    L: "Local",
    T: "Taller",
    A: "Agencia",
  };

  const ultimoEvento = caso.eventos[0];
  const obtenerNombreZona = (geocercas_json) => {
    if (!geocercas_json) return null;

    try {
      const data =
        typeof geocercas_json === "string"
          ? JSON.parse(geocercas_json)
          : geocercas_json;

      if (!Array.isArray(data.zones) || data.zones.length === 0) return null;

      const z = data.zones[0];

      // 👇 AQUÍ ESTÁ LA CLAVE
      if (typeof z === "string") return z;
      if (typeof z === "object") return z.name ?? z.nombre ?? null;

      return null;
    } catch (e) {
      return null;
    }
  };


  // 👉 AQUÍ estaba lo que te faltaba
  const zonaActual = obtenerNombreZona(ultimoEvento?.geocercas_json);

  const esPanico =
    (ultimoEvento?.tipoNorm || "").toUpperCase() === "PANICO";

  const geocerca = ultimoEvento?.geocercaSLTA ?? null;

  const textoGeocerca = geocerca
    ? `${SLTA_LABEL[geocerca] ?? geocerca}${zonaActual ? ` · ${zonaActual}` : ""
    }`
    : null;

  const enSucursal = geocerca === "S";

  const borderClass = esPanico
    ? "border-red-500 bg-red-50"
    : enSucursal
      ? "border-blue-400 bg-blue-50"
      : "border-gray-300";

  const esPanicoEnSucursal = esPanico && enSucursal;




  const manejarLlamadaCabina = async () => {
    const codigo = getCodigoAgente();
    if (!codigo) {
      await Swal.fire({
        icon: "warning",
        title: "Código requerido",
        text: "Debes ingresar el código del agente antes de realizar la llamada.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    onLlamarCabina(ultimoEvento, { codigoAgente: codigo });
  };

  return (
    <div
      className={`
    mb-1 rounded-md border transition shadow-sm
    ${borderClass}
    ${isSelected ? "ring-1 ring-gray-400" : ""}
  `}
    >
      {/* FILA PRINCIPAL */}
      <div className="grid grid-cols-[1.6fr_1.4fr_auto_auto] items-center gap-4 px-3 py-2">
        {/* UNIDAD + TIPO */}
        {/* UNIDAD + TIPO */}
        <div className="min-w-0 space-y-0.5">
          <div className="font-extrabold text-[13px] text-gray-900 truncate">
            {caso.unidad}
          </div>

          {/* BADGES */}
          <div className="flex flex-wrap items-center gap-1">
            {esPanico && (
              <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                PÁNICO
              </span>
            )}

            {textoGeocerca && (
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold
        ${esPanicoEnSucursal
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : enSucursal
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }
      `}
                title={zonaActual ?? ""}
              >
                📍 {textoGeocerca}
              </span>
            )}
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


          {/*           <button
            title="Llamar operador"
            onClick={() => onLlamarOperador(ultimoEvento)}
            className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            📞
          </button>
 */}
          <button
            title="Llamada a cabina"
            onClick={manejarLlamadaCabina}
            className="px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          </button>
          <button
            title="Ver ubicación en tiempo real"
            onClick={() => onMapa(caso)}
            className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            🗺
          </button>
                    <button
            title="Analizar caso"
            onClick={() => onAnalizar(caso)}
            className="px-3 py-1 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
          >
            Protocolo
          </button>
        </div>

        {/* EXPAND */}
        <div
          title={
            caso.expanded ? "Ocultar detalle del caso" : "Ver detalle del caso"
          }
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
              <strong className="text-gray-900">{e.tipoNorm}: </strong>
              {e.mensaje}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(CasoActivoCard);
