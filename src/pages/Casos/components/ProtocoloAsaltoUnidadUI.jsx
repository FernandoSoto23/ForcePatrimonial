import React, { useMemo, useRef, useState } from "react";

// Detalles (bullets) del protocolo Asalto a Unidad
const DETAILS = Object.freeze([
  "Solicitar operativo al 088 y 911 del estado del evento",
  "Solicitud de información detallada del evento (asalto).",
  "¿Cómo ocurrió? ¿Dónde y cuándo ocurrió? (Revisar grabaciones en Samsara).",
  "Descripción y cantidad de sujetos involucrados.",
  "Tipo de afectación reportada.",
  "Informar a Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato.",
  "Validar con Supervisor de CMS e informar a Gerente de Seguridad, Coord. de CMS, Coord. de Seguridad Operativa y Líder de Seguridad Patrimonial.",
  "Emitir correo informativo a las áreas involucradas (Logística, Sucursal, TC, Seguridad, CMS, Seguridad Operativa, Seguridad Patrimonial).",
]);

function fmt(t) {
  if (!t) return "—";
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const makeInitialState = () =>
  DETAILS.map(() => ({ count: 0, note: "" }));

export default function ProtocoloAsaltoUnidadUI() {
  const [rows, setRows] = useState(makeInitialState);
  const [missingMap, setMissingMap] = useState({});
  const [globalError, setGlobalError] = useState(null);

  // refs para scrollear a faltantes
  const cardRefs = useRef([]);

  const progress = useMemo(() => {
    const total = DETAILS.length;
    const withAtLeastOne = rows.reduce(
      (acc, r) => acc + (r.count > 0 ? 1 : 0),
      0
    );
    return { total, withAtLeastOne };
  }, [rows]);

  const saveCheck = (idx) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[idx] };
      const now = Date.now();

      cur.count = (cur.count || 0) + 1;
      if (!cur.first) cur.first = now;
      cur.last = now;

      next[idx] = cur;
      return next;
    });

    setMissingMap((prev) => {
      if (!prev[idx]) return prev;
      const next = { ...prev };
      delete next[idx];
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
    setMissingMap({});
    setGlobalError(null);
  };

  const downloadCSV = () => {
    const lines = [
      "orden,detalle,primer_check,ultimo_check,checks,nota",
    ];

    DETAILS.forEach((txt, i) => {
      const r = rows[i] || { count: 0, note: "" };
      lines.push(
        [
          i + 1,
          `"${txt.replace(/"/g, '""')}"`,
          fmt(r.first),
          fmt(r.last),
          r.count || 0,
          `"${(r.note || "").replace(/"/g, '""')}"`,
        ].join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "protocolo_asalto_unidad_checks.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onContinuar = () => {
    const missing = {};

    DETAILS.forEach((_, i) => {
      if (!rows[i] || rows[i].count <= 0) {
        missing[i] = true;
      }
    });

    const missingIdxs = Object.keys(missing).map(Number);

    if (missingIdxs.length > 0) {
      setMissingMap(missing);
      setGlobalError(
        `Te faltan ${missingIdxs.length} punto(s) por completar.`
      );

      const first = missingIdxs[0];
      const el = cardRefs.current[first];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setMissingMap({});
    setGlobalError(null);
    alert("✅ Protocolo completo. Puedes continuar.");
  };

  const missingList = useMemo(
    () =>
      Object.keys(missingMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map((i) => ({ i, text: DETAILS[i] })),
    [missingMap]
  );

  return (
    <main className="bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Protocolo – Asalto a Unidad
          </h1>

          <div className="flex gap-2 text-sm">
            <span className="rounded-full border px-3 py-1 bg-white">
              {progress.withAtLeastOne}/{progress.total}
            </span>

            <button
              onClick={downloadCSV}
              className="rounded-full border px-3 py-1 bg-white hover:bg-slate-100"
            >
              ⬇ CSV
            </button>

            <button
              onClick={restartFlow}
              className="rounded-full border px-3 py-1 bg-white hover:bg-slate-100"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {/* Error */}
        {globalError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-semibold text-rose-800">{globalError}</p>

            <ul className="mt-2 list-disc pl-5 text-sm">
              {missingList.map((m) => (
                <li key={m.i}>
                  <button
                    className="underline"
                    onClick={() =>
                      cardRefs.current[m.i]?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                    }
                  >
                    Punto {m.i + 1}
                  </button>{" "}
                  – {m.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detalles */}
        <section className="space-y-4">
          {DETAILS.map((txt, i) => {
            const r = rows[i];
            const isMissing = missingMap[i];

            return (
              <div
                key={i}
                ref={(el) => (cardRefs.current[i] = el)}
                className={`rounded-xl border p-4 ${
                  isMissing
                    ? "border-rose-300 ring-2 ring-rose-200"
                    : "border-slate-200"
                }`}
              >
                <p className="text-sm">{txt}</p>

                <button
                  onClick={() => saveCheck(i)}
                  className="mt-2 rounded-full border px-3 py-1 text-sm bg-white hover:bg-slate-50"
                >
                  ✅ Guardar check
                </button>

                <div className="mt-2 text-xs text-slate-500">
                  Checks: {r.count || 0} · Primer: {fmt(r.first)} · Último:{" "}
                  {fmt(r.last)}
                </div>

                <textarea
                  value={r.note}
                  onChange={(e) => updateNote(i, e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border p-2 text-sm"
                  placeholder="Observaciones"
                />
              </div>
            );
          })}
        </section>

        <button
          onClick={onContinuar}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700"
        >
          Continuar
        </button>
      </div>
    </main>
  );
}
