import React, { useMemo, useState } from "react";

/**
 * STEPS CONFIG
 */
const STEPS = [
  {
    id: 1,
    title: "Enfermedad, accidente laboral o cansancio",
    isDecision: true,
    details: [
      "Al recibir información verificar en plataforma Samsara las posturas y movimientos anormales de tripulación y cuestionar el estado físico.",
    ],
  },
  {
    id: 2,
    title:
      "En caso de confirmar que se requiere atención médica (Enfermedad Grave o Accidente Laboral)",
    details: [
      "Solicitar apoyo a las autoridades al 088 y 911 y solicitar atención médica.",
      "Ir al paso 4.",
    ],
  },
  {
    id: 3,
    title: "En caso de solo cansancio",
    details: [
      "Informar a Líder de Operaciones, Logística, Servicio Express o PXGL la necesidad del Colaborador para que dé seguimiento a la situación.",
      "Ir al paso 4.",
    ],
  },
  {
    id: 4,
    title: "Informar la situación",
    details: [
      "Informar a Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato según sea el servicio afectado, para coordinar que acuda personal al sitio.",
      "Validar con Supervisor de CMS e informar a Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial de la zona.",
      "Emitir el correo informativo a Gerente de Logística, Gerente de Sucursal, Torre de Control, Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial.",
    ],
  },
];

/**
 * Utils
 */
function fmt(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function makeInitialState() {
  const state = {};
  STEPS.forEach((s) => {
    state[s.id] = s.details.map(() => ({
      count: 0,
      first: undefined,
      last: undefined,
      noteDraft: "",
      history: [],
      showHistory: false,
    }));
  });
  return state;
}

export default function ProtocoloEnfermedadAccidenteCansancioLineal() {
  const [current, setCurrent] = useState(1);
  const [decision, setDecision] = useState(undefined); // "SI" | "NO"
  const [rows, setRows] = useState(makeInitialState);

  const progress = useMemo(() => {
    const totals = STEPS.reduce((acc, s) => acc + s.details.length, 0);
    const withAtLeastOne = Object.values(rows)
      .flat()
      .reduce((acc, r) => acc + (r.count > 0 ? 1 : 0), 0);
    return { totals, withAtLeastOne };
  }, [rows]);

  /**
   * Actions
   */
  const saveCheck = (stepId, idx) => {
    setRows((prev) => {
      const next = { ...prev };
      const list = [...next[stepId]];
      const cur = { ...list[idx] };
      const now = Date.now();

      cur.count = (cur.count || 0) + 1;
      if (!cur.first) cur.first = now;
      cur.last = now;

      if (cur.noteDraft.trim()) {
        cur.history = [
          { t: now, note: cur.noteDraft.trim() },
          ...cur.history,
        ];
        cur.noteDraft = "";
      }

      list[idx] = cur;
      next[stepId] = list;
      return next;
    });
  };

  const toggleHistory = (stepId, idx) => {
    setRows((prev) => {
      const next = { ...prev };
      const list = [...next[stepId]];
      list[idx] = { ...list[idx], showHistory: !list[idx].showHistory };
      next[stepId] = list;
      return next;
    });
  };

  const setDraft = (stepId, idx, note) => {
    setRows((prev) => {
      const next = { ...prev };
      const list = [...next[stepId]];
      list[idx] = { ...list[idx], noteDraft: note };
      next[stepId] = list;
      return next;
    });
  };

  const restart = () => {
    setCurrent(1);
    setDecision(undefined);
    setRows(makeInitialState());
  };

  const downloadCSV = () => {
    const lines = [
      "paso,titulo,orden,detalle,primer_check,ultimo_check,checks,nota_ultima,notas_historial",
    ];

    STEPS.forEach((s) => {
      s.details.forEach((txt, i) => {
        const r = rows[s.id][i];
        const hist = r.history
          .map((h) => `${fmt(h.t)} — ${h.note.replace(/"/g, '""')}`)
          .join(" | ");

        lines.push(
          [
            `Paso ${s.id}`,
            `"${s.title.replace(/"/g, '""')}"`,
            i + 1,
            `"${txt.replace(/"/g, '""')}"`,
            fmt(r.first),
            fmt(r.last),
            r.count || 0,
            `"${(r.history[0]?.note || "").replace(/"/g, '""')}"`,
            `"${hist}"`,
          ].join(",")
        );
      });
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "protocolo_enfermedad_accidente_cansancio_lineal.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goNext = () => {
    if (current === 1) {
      if (decision === "SI") setCurrent(2);
      if (decision === "NO") setCurrent(3);
      return;
    }
    if (current === 2 || current === 3) {
      setCurrent(4);
    }
  };

  /**
   * UI
   */
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Protocolo – Enfermedad, accidente laboral o cansancio
          </h1>

          <div className="flex gap-2 text-sm">
            <span className="rounded-full border bg-white px-3 py-1">
              {progress.withAtLeastOne}/{progress.totals}
            </span>
            <button
              onClick={downloadCSV}
              className="rounded-full border bg-white px-3 py-1 hover:bg-slate-100"
            >
              ⬇ CSV
            </button>
            <button
              onClick={restart}
              className="rounded-full border bg-white px-3 py-1 hover:bg-slate-100"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {/* STEP */}
        {STEPS.filter((s) => s.id === current).map((step) => (
          <section
            key={step.id}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <h2 className="mb-4 font-semibold">{step.title}</h2>

            {step.details.map((txt, i) => {
              const r = rows[step.id][i];

              return (
                <div
                  key={i}
                  className="mb-4 rounded-xl border bg-white p-3"
                >
                  <p className="mb-2 text-sm">{txt}</p>

                  <div className="mb-2 text-xs text-slate-600 flex flex-wrap gap-4">
                    <span>Primer: {fmt(r.first)}</span>
                    <span>Último: {fmt(r.last)}</span>
                    <span>Checks: {r.count}</span>

                    <button
                      onClick={() => toggleHistory(step.id, i)}
                      className="underline"
                    >
                      {r.showHistory
                        ? "Ocultar historial"
                        : "Mostrar historial"}
                    </button>
                  </div>

                  <textarea
                    value={r.noteDraft}
                    onChange={(e) =>
                      setDraft(step.id, i, e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-xl border p-3 text-sm bg-white text-slate-900"
                    placeholder="Nota para este check"
                  />

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => saveCheck(step.id, i)}
                      className="rounded-full border bg-emerald-50 px-3 py-1 text-sm"
                    >
                      ✅ Guardar check
                    </button>
                  </div>

                  {r.showHistory && (
                    <div className="mt-2 rounded-lg border bg-slate-50 p-2 text-xs">
                      {r.history.length === 0
                        ? "Sin historial"
                        : r.history.map((h, k) => (
                            <div key={k}>
                              {fmt(h.t)} — {h.note}
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              );
            })}

            {step.isDecision && (
              <div className="flex gap-3">
                <button
                  onClick={() => setDecision("SI")}
                  className={`rounded-full px-4 py-2 text-sm border ${
                    decision === "SI"
                      ? "bg-emerald-600 text-white"
                      : "bg-white"
                  }`}
                >
                  Sí → Atención médica
                </button>

                <button
                  onClick={() => setDecision("NO")}
                  className={`rounded-full px-4 py-2 text-sm border ${
                    decision === "NO"
                      ? "bg-amber-600 text-white"
                      : "bg-white"
                  }`}
                >
                  No → Solo cansancio
                </button>
              </div>
            )}

            <footer className="mt-4 flex justify-between">
              <span className="text-xs text-slate-500">
                Paso {step.id} de 4
              </span>

              <div className="flex gap-2">
                {current > 1 && (
                  <button
                    onClick={() => setCurrent(current - 1)}
                    className="rounded-full border bg-white px-3 py-1 text-sm"
                  >
                    ← Anterior
                  </button>
                )}
                {current < 4 && (
                  <button
                    onClick={goNext}
                    className="rounded-full bg-indigo-600 px-3 py-1 text-sm text-white"
                  >
                    Continuar →
                  </button>
                )}
              </div>
            </footer>
          </section>
        ))}
      </div>
    </main>
  );
}
