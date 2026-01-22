import { useMemo } from "react";
import { PREGUNTAS_EVALUACION } from "./preguntasEvaluacion";

export default function EvaluacionOperativa({ value, onChange }) {
  const preguntasVisibles = useMemo(() => {
    return PREGUNTAS_EVALUACION.filter((p) => {
      if (!p.dependsOn) return true;
      return value[p.dependsOn]?.respuesta === p.showIf;
    });
  }, [value]);

  const responder = (key, respuesta) => {
    onChange({
      ...value,
      [key]: {
        respuesta,
        hora: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="mt-10 border border-red-300 rounded-xl p-5 bg-red-50 space-y-4">
      <h3 className="text-sm font-bold text-red-700">
        🧠 Evaluación operativa del evento
      </h3>

      {preguntasVisibles.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-xs text-gray-800">{label}</span>

          <div className="flex gap-2">
            <button
              onClick={() => responder(key, true)}
              className={`px-3 py-1 rounded text-xs font-semibold
                ${
                  value[key]?.respuesta === true
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
            >
              Sí
            </button>

            <button
              onClick={() => responder(key, false)}
              className={`px-3 py-1 rounded text-xs font-semibold
                ${
                  value[key] === false
                    ? "bg-red-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
            >
              No
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
