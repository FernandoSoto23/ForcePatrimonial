import { useMemo, useEffect } from "react";
import { generarPreguntas } from "./preguntasEvaluacion";
export default function EvaluacionOperativa({
  value,
  onChange,
  contextoEvento = {},
}) {
  const preguntasVisibles = useMemo(() => {
    return generarPreguntas(contextoEvento).filter((p) => {
      if (!p.dependsOn) return true;
      return value[p.dependsOn]?.respuesta === p.showIf;
    });
  }, [value, contextoEvento]);

  const marcarEjecutado = (key) => {
    onChange({
      ...value,
      [key]: {
        ...(value[key] || {}),
        ejecutado: true,
        horaEjecucion: new Date().toISOString(),
      },
    });
  };

  const responder = (key, respuesta) => {
    onChange({
      ...value,
      [key]: {
        ...(value[key] || {}),
        ejecutado: true,
        horaEjecucion: value[key]?.horaEjecucion || new Date().toISOString(),
        respuesta,
      },
    });
  };
  useEffect(() => {
    const preguntasActuales = generarPreguntas(contextoEvento);
    const keysValidas = new Set(preguntasActuales.map(p => p.key));

    const limpio = Object.fromEntries(
      Object.entries(value || {}).filter(([k]) => keysValidas.has(k))
    );

    if (Object.keys(limpio).length !== Object.keys(value || {}).length) {
      onChange(limpio);
    }
  }, [contextoEvento]);

  return (
    <div className="mt-6 border border-gray-300 rounded-lg bg-white">
      {/* HEADER */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Evaluación operativa
        </h3>
      </div>

      {/* PREGUNTAS */}
      <div className="divide-y">
        {preguntasVisibles.map((p) => {
          const { key, label, tipoRespuesta } = p;
          const respuesta = value[key]?.respuesta;
          const hora = value[key]?.horaEjecucion;

          return (
            <div
              key={key}
              className="px-4 py-3 flex flex-col gap-1 text-sm border-b"
            >
              {/* TÍTULO */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="font-medium text-gray-900">{label}</span>
              </div>

              {/* RESULTADO */}
              {respuesta !== undefined && (
                <div className="text-xs text-gray-700">
                  Resultado:{" "}
                  <span className="font-semibold">
                    {tipoRespuesta === "riesgo"
                      ? respuesta
                        ? "Riesgo"
                        : "Sin riesgo"
                      : respuesta
                        ? "Sí"
                        : "No"}
                  </span>
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => responder(key, true)}
                  className="px-3 py-1 text-xs rounded bg-gray-900 text-white"
                >
                  {tipoRespuesta === "riesgo" ? "Riesgo" : "Sí"}
                </button>

                <button
                  onClick={() => responder(key, false)}
                  className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-800"
                >
                  {tipoRespuesta === "riesgo" ? "Sin riesgo" : "No"}
                </button>
              </div>

              {/* HORA */}
              {hora && (
                <div className="text-[10px] text-gray-400">
                  Ejecutado: {new Date(hora).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
