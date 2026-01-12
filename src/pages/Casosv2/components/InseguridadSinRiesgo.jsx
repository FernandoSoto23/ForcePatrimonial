import React, { useMemo, useRef, useState } from "react";

const DETAILS = Object.freeze([
  "Solicitar operativo al 088 y 911 del estado del evento y personas involucradas (Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato).",
  "Al recibir información o detectar despojo de unidad, unidad detenida en lugar no autorizado y unidades realizando movimiento sin asignar; si al verificar por llamada e imágenes se detecta el riesgo, solicitar operativo directo.",
  "Notificar a Supervisor de CMS el comando de paro de motor o solicitar a enlace Freightliner y OnCommand en caso de no tenerlo en Wialon; solo si está detenido o avanzando a < 50 km/h.",
  "Informar a Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato según servicio afectado, para coordinar que acuda personal al sitio.",
  "Validar con Supervisor de CMS e informar a Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial de la zona para coordinar búsqueda de tripulación y unidad.",
  "Emitir el correo informativo a Gerente de Logística, Gerente de Sucursal, Torre de Control, Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial.",
]);

function fmt(t) {
  if (!t) return "—";
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

const makeInitialState = () =>
  DETAILS.map(() => ({ count: 0, note: "" }));

export default function ProtocoloRoboUnidad() {
  const [rows, setRows] = useState(makeInitialState);
  const [error, setError] = useState(null);

  // refs para llevar al primer faltante
  const rowRefs = useRef([]);
  const noteRefs = useRef([]);

  const progress = useMemo(() => {
    const total = DETAILS.length;
    const withAtLeastOne = rows.filter(
      (r) => r.count > 0 && r.note.trim()
    ).length;
    return { total, withAtLeastOne };
  }, [rows]);

  const saveCheck = (idx) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[idx] };
      const now = Date.now();

      cur.count += 1;
      if (!cur.first) cur.first = now;
      cur.last = now;

      next[idx] = cur;
      return next;
    });
  };

  const updateNote = (idx, note) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], note };
      return next;
    });
  };

  const restartFlow = () => {
    setRows(makeInitialState());
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToIndex = (idx) => {
    const el = rowRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        noteRefs.current[idx]?.focus();
      }, 250);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const validateAndContinue = () => {
    let firstMissingIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.count === 0 || !r.note.trim()) {
        firstMissingIndex = i;
        break;
      }
    }

    if (firstMissingIndex !== -1) {
      const missingChecks = [];
      const missingNotes = [];

      rows.forEach((r, i) => {
        if (r.count === 0) missingChecks.push(i + 1);
        if (!r.note.trim()) missingNotes.push(i + 1);
      });

      const parts = [];
      if (missingChecks.length)
        parts.push(`faltan checks en: ${missingChecks.join(", ")}`);
      if (missingNotes.length)
        parts.push(`faltan notas en: ${missingNotes.join(", ")}`);

      setError(`No puedes continuar, ${parts.join(" · ")}`);
      scrollToIndex(firstMissingIndex);
      return;
    }

    setError(null);

    // Evento global para historial
    window.dispatchEvent(
      new CustomEvent("protocol:completed", {
        detail: {
          tipo: "Robo a Unidad",
          estatus: "Cerrada",
          unidad: "",
          folio: "",
          createdAt: new Date().toISOString(),
        },
      })
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
              🚚
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Protocolo – Robo a Unidad
              </h1>
              <p className="text-xs text-slate-500">
                Checks + nota obligatoria por punto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full border bg-white px-3 py-1">
              {progress.withAtLeastOne}/{progress.total} completos
            </span>

            <button
              onClick={restartFlow}
              className="rounded-full border bg-white px-3 py-1 hover:bg-slate-50"
              type="button"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ⚠️ {error}
          </div>
        )}

        {/* Paso */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <header className="border-b px-4 py-3 flex justify-between">
            <div className="font-semibold">Paso 1: Robo a Unidad</div>
            <div className="text-xs text-slate-500">
              {progress.withAtLeastOne}/{progress.total}
            </div>
          </header>

          <div className="space-y-4 p-4">
            {DETAILS.map((txt, i) => {
              const r = rows[i];
              const missingCheck = r.count === 0;
              const missingNote = !r.note.trim();
              const warn = missingCheck || missingNote;

              return (
                <div
                  key={i}
                  ref={(el) => (rowRefs.current[i] = el)}
                  className={`rounded-2xl border p-4 ${
                    warn ? "border-amber-300" : "border-slate-200"
                  }`}
                >
                  <div className="mb-2 flex justify-between gap-3">
                    <p className="text-sm leading-6">
                      <strong>{i + 1}.</strong> {txt}
                    </p>

                    <button
                      onClick={() => saveCheck(i)}
                      className="rounded-full border px-3 py-1 text-sm bg-white hover:bg-slate-50 whitespace-nowrap"
                      type="button"
                    >
                      ✅ Guardar check
                    </button>
                  </div>

                  <div className="mb-2 text-xs text-slate-500">
                    Primer: <span className="font-medium">{fmt(r.first)}</span>{" "}
                    · Último: <span className="font-medium">{fmt(r.last)}</span>{" "}
                    · Checks: <span className="font-medium">{r.count}</span>
                    {missingCheck && (
                      <span className="ml-2 text-amber-700">
                        (falta check)
                      </span>
                    )}
                  </div>

                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Nota (obligatoria)
                  </label>

                  <textarea
                    ref={(el) => (noteRefs.current[i] = el)}
                    value={r.note}
                    onChange={(e) => updateNote(i, e.target.value)}
                    rows={3}
                    placeholder="Escribe la nota obligatoria para este punto"
                    className={`
                      w-full rounded-xl border p-3 text-sm outline-none
                      bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900
                      ${
                        missingNote
                          ? "border-amber-300 focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                          : "border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      }
                    `}
                  />

                  {missingNote && (
                    <div className="mt-2 text-xs text-amber-700">
                      ⚠️ Falta escribir la nota.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="border-t p-4">
            <button
              onClick={validateAndContinue}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700"
              type="button"
            >
              Continuar
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
