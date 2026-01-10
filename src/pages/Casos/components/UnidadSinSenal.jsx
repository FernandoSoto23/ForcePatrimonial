import React, { useCallback, useMemo, useState } from "react";

/* =========================
   Config
========================= */

// En Vite las envs son import.meta.env
const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* =========================
   Data
========================= */

const STEPS = [
  {
    id: 1,
    title: "Unidades sin señal",
    details: ["Verificar geocercas de zona de baja cobertura"],
    decision: {
      yes: "Unidad sin reportar en zona de baja cobertura",
      no: "Unidad pierde señal en zona no identificada como zona de baja cobertura",
    },
  },
  {
    id: 2,
    title: "Unidad sin reportar en zona de baja cobertura",
    details: [
      "Identifica zona de baja cobertura.",
      "Seguimiento a salida de unidad de zona de baja cobertura.",
      "Unidad supera tiempo estimado sin reportar en zona de cobertura.",
      "Llamar a tripulación confirmando todo en orden (celular o llamada a cabina).",
    ],
    decision: {
      yes: "Reacción ante amenaza de riesgo latente",
      no: "Se descarta amenaza de riesgo",
    },
  },
  {
    id: 3,
    title: "Reacción ante amenaza de riesgo latente",
    details: [
      "Revisión con autoridades sobre la vialidad en la zona.",
      "No tener reportes de autoridades que entorpezcan la ruta.",
      "No comunicación con tripulación.",
      "Excedente de tiempo sin reporte de unidad en plataforma.",
      "Levantar operativo al 088 y 911.",
      "Informar a equipo de logística encargado de la zona.",
      "Informar líderes de seguridad.",
      "Solicitar unidad de seguridad a la zona.",
    ],
  },
  {
    id: 4,
    title: "Se descarta amenaza de riesgo",
    details: [
      "Se logra comunicación con tripulación.",
      "Unidad comienza a reportar.",
      "Visión de cámara Samsara en tiempo.",
      "Unidad en circulación ruta asignada.",
    ],
  },
  {
    id: 5,
    title:
      "Unidad pierde señal en zona no identificada como zona de baja cobertura",
    details: [
      "Enviar comando “posición actual” o “reset del equipo”.",
      "Revisión en cámara Samsara.",
      "Llamada a cabina modo espía.",
      "Unidad en circulación ruta asignada.",
    ],
    decision: {
      yes: "Reacción ante amenaza de riesgo latente",
      no: "Se descarta amenaza de riesgo",
    },
  },
  {
    id: 6,
    title: "Informar, validar y comunicar",
    details: [
      "Informar a gerencias, torre de control y líderes.",
      "Validar con Supervisor de CMS y Seguridad.",
      "Emitir correo informativo a áreas involucradas.",
      "Publicar en grupo LAICA si se confirma despojo.",
    ],
  },
];

/* =========================
   Helpers
========================= */

function fmt(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function makeInitialState() {
  const state = {};
  STEPS.forEach((s) => {
    state[s.id] = s.details.map(() => ({
      count: 0,
      noteDraft: "",
      history: [],
      showHistory: false,
    }));
  });
  return state;
}

function getQS() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/* =========================
   Component
========================= */

export default function UnidadSinSenal() {
  const qs = useMemo(() => getQS(), []);
  const folio = qs.get("folio") || "";
  const unidadQ = qs.get("unidad") || "";
  const horaQ = qs.get("hora") || "";
  const tipoQ = qs.get("tipo") || "Unidades sin señal";

  const [current, setCurrent] = useState(1);
  const [rows, setRows] = useState(makeInitialState);
  const [decisions, setDecisions] = useState({});
  const [toast, setToast] = useState(null);

  const progress = useMemo(() => {
    const totals = STEPS.reduce((a, s) => a + s.details.length, 0);
    const withAtLeastOne = Object.values(rows)
      .flat()
      .reduce((a, r) => a + (r.count > 0 ? 1 : 0), 0);
    return { totals, withAtLeastOne };
  }, [rows]);

  const setDecision = (step, ans) =>
    setDecisions((d) => ({ ...d, [step]: ans }));

  const saveCheck = (stepId, idx) => {
    setRows((prev) => {
      const next = { ...prev };
      const list = [...next[stepId]];
      const cur = { ...list[idx] };
      const now = Date.now();

      cur.count += 1;
      if (!cur.first) cur.first = now;
      cur.last = now;

      if (cur.noteDraft.trim()) {
        cur.history.unshift({ t: now, note: cur.noteDraft.trim() });
        cur.noteDraft = "";
      }

      list[idx] = cur;
      next[stepId] = list;
      return next;
    });
  };

  const setDraft = (stepId, idx, note) => {
    setRows((prev) => {
      const next = { ...prev };
      next[stepId][idx] = { ...next[stepId][idx], noteDraft: note };
      return next;
    });
  };

  const toggleHistory = (stepId, idx) => {
    setRows((prev) => {
      const next = { ...prev };
      const cur = next[stepId][idx];
      next[stepId][idx] = { ...cur, showHistory: !cur.showHistory };
      return next;
    });
  };

  const restart = () => {
    setCurrent(1);
    setDecisions({});
    setRows(makeInitialState());
  };

  const goNext = () => {
    if (current === 1) {
      if (decisions[1] === "YES") return setCurrent(2);
      if (decisions[1] === "NO") return setCurrent(5);
    }
    if (current === 2) {
      if (decisions[2] === "YES") return setCurrent(3);
      if (decisions[2] === "NO") return setCurrent(4);
    }
    if (current === 5) {
      if (decisions[5] === "YES") return setCurrent(3);
      if (decisions[5] === "NO") return setCurrent(4);
    }
    if (current === 3 || current === 4) setCurrent(6);
  };

  const enviarCorreoManual = useCallback(async () => {
    let u = unidadQ;
    let h = horaQ;
    const enlace = window.location.href;

    if ((!u || !h) && folio) {
      try {
        const r = await fetch(`${API}/incidencias/${folio}`);
        if (r.ok) {
          const j = await r.json();
          if (!u) u = j.unidad || "";
          if (!h) h = j.hora || "";
        }
      } catch {}
    }

    await fetch(`${API}/notifications/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folio, unidad: u, hora: h, tipo: tipoQ, enlace }),
    });

    setToast("Correo enviado.");
    setTimeout(() => setToast(null), 2500);
  }, [folio, unidadQ, horaQ, tipoQ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Protocolo – Unidades sin señal
          </h1>

          <div className="flex gap-2 text-sm">
            <span className="rounded-full border bg-white px-3 py-1">
              {progress.withAtLeastOne}/{progress.totals}
            </span>

            <button
              onClick={enviarCorreoManual}
              className="rounded-full border bg-indigo-50 px-3 py-1"
            >
              📤 Enviar correo
            </button>

            <button
              onClick={restart}
              className="rounded-full border bg-white px-3 py-1"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {/* Paso */}
        {STEPS.filter((s) => s.id === current).map((step) => (
          <section
            key={step.id}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold mb-3">{step.title}</h2>

            {step.details.map((txt, i) => {
              const r = rows[step.id][i];
              return (
                <div key={i} className="mb-4 rounded-xl border bg-slate-50 p-3">
                  <div className="text-sm mb-2">{txt}</div>

                  <div className="text-xs mb-1">
                    Primer: {fmt(r.first)} · Último: {fmt(r.last)} · Checks:{" "}
                    {r.count}
                  </div>

                  <textarea
                    value={r.noteDraft}
                    onChange={(e) => setDraft(step.id, i, e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border p-2 text-sm bg-white text-slate-900"
                    placeholder="Nota para este check"
                  />

                  <div className="mt-2 flex justify-between">
                    <button
                      onClick={() => toggleHistory(step.id, i)}
                      className="text-xs underline"
                    >
                      {r.showHistory ? "Ocultar historial" : "Ver historial"}
                    </button>

                    <button
                      onClick={() => saveCheck(step.id, i)}
                      className="rounded-full border bg-emerald-50 px-3 py-1 text-sm"
                    >
                      Guardar check
                    </button>
                  </div>

                  {r.showHistory && (
                    <div className="mt-2 text-xs">
                      {r.history.map((h, k) => (
                        <div key={k}>
                          {fmt(h.t)} — {h.note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {step.decision && (
              <div className="flex gap-3">
                <button
                  onClick={() => setDecision(step.id, "YES")}
                  className={`px-4 py-2 rounded-full border ${
                    decisions[step.id] === "YES"
                      ? "bg-emerald-600 text-white"
                      : "bg-white"
                  }`}
                >
                  Sí
                </button>
                <button
                  onClick={() => setDecision(step.id, "NO")}
                  className={`px-4 py-2 rounded-full border ${
                    decisions[step.id] === "NO"
                      ? "bg-amber-600 text-white"
                      : "bg-white"
                  }`}
                >
                  No
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              {current > 1 && (
                <button
                  onClick={() => setCurrent(current - 1)}
                  className="rounded-full border px-3 py-1"
                >
                  ← Anterior
                </button>
              )}
              {current < 6 && (
                <button
                  onClick={goNext}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-white"
                >
                  Continuar →
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5">
          <div className="rounded-xl border bg-indigo-50 p-3 text-sm">
            ✅ {toast}
          </div>
        </div>
      )}
    </div>
  );
}
