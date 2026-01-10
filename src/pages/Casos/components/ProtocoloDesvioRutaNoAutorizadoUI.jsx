import React, { useMemo, useState } from "react";

const DETAILS = Object.freeze([
  "Al detectar el desvío de ruta y verificar el riesgo mediante llamada e imágenes, solicitar operativo directo.",
  "Solicitar operativo al 088 y 911 del estado del evento y personas involucradas (Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato).",
  "Notificar a Supervisor de CMS el comando de paro de motor o solicitar a enlace Freightliner y OnCommand en caso de no tenerlo en Wialon; solo si está detenido o avanzando a baja velocidad (< 50 km/h).",
  "Informar a Gerente de Logística, Gerente de Sucursal, Torre de Control, Líder inmediato según sea el servicio afectado, para coordinar que acuda personal al sitio.",
  "Validar con Supervisor de CMS e informar a Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial de la zona para coordinar la búsqueda de la tripulación y unidad.",
  "Emitir el correo informativo a Gerente de Logística, Gerente de Sucursal, Torre de Control, Gerente de Seguridad, Coordinador de CMS, Coordinador de Seguridad Operativa y Líder de Seguridad Patrimonial.",
  "Comunicar a Supervisor de CMS que debe publicar en el grupo de LAICA la información del evento, solo en caso de que se confirme el despojo de unidad.",
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

function validate(rows) {
  const missingChecks = [];
  const missingNotes = [];

  rows.forEach((r, i) => {
    if (!r.count || r.count <= 0) missingChecks.push(i + 1);
    if (!r.note || !r.note.trim()) missingNotes.push(i + 1);
  });

  return { missingChecks, missingNotes };
}

export default function ProtocoloDesvioRutaNoAutorizadoUI() {
  const [rows, setRows] = useState(makeInitialState);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState({
    missingChecks: [],
    missingNotes: [],
  });

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
    setMissing({ missingChecks: [], missingNotes: [] });
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
    a.download = "protocolo_desvio_ruta_no_autorizado_checks.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onContinuar = () => {
    const v = validate(rows);
    setMissing(v);

    const problems = [];
    if (v.missingChecks.length)
      problems.push(`Faltan checks en: ${v.missingChecks.join(", ")}`);
    if (v.missingNotes.length)
      problems.push(`Faltan notas en: ${v.missingNotes.join(", ")}`);

    if (problems.length) {
      setError(`No puedes continuar. ${problems.join(" · ")}`);
      return;
    }

    setError(null);

    // Evento para historial
    window.dispatchEvent(
      new CustomEvent("protocol:completed", {
        detail: {
          tipo: "Desvío de ruta",
          estatus: "Cerrada",
          unidad: "",
          folio: "",
          createdAt: new Date().toISOString(),
        },
      })
    );
  };

  const isMissingCheck = (idx) =>
    missing.missingChecks.includes(idx + 1);
  const isMissingNote = (idx) =>
    missing.missingNotes.includes(idx + 1);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-semibold">
            Protocolo – Desvío de ruta no autorizado
          </h1>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border bg-white px-3 py-1">
              {progress.withAtLeastOne}/{progress.total}
            </span>

            <button
              onClick={downloadCSV}
              className="rounded-full border bg-white px-3 py-1 hover:bg-slate-50"
            >
              ⬇ CSV
            </button>

            <button
              onClick={restartFlow}
              className="rounded-full border bg-white px-3 py-1 hover:bg-slate-50"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>No se puede avanzar.</strong> {error}
          </div>
        )}

        {/* Detalles */}
        <section className="rounded-2xl border bg-white p-4 space-y-4">
          {DETAILS.map((txt, i) => {
            const r = rows[i];
            const warn = isMissingCheck(i) || isMissingNote(i);

            return (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  warn ? "border-amber-300" : "border-slate-200"
                }`}
              >
                <p className="text-sm mb-2">
                  <strong>#{i + 1}.</strong> {txt}
                </p>

                <button
                  onClick={() => saveCheck(i)}
                  className="mb-2 rounded-full border px-3 py-1 text-sm bg-white hover:bg-slate-50"
                >
                  ✅ Guardar check
                </button>

                <div className="mb-2 text-xs text-slate-500">
                  Checks: {r.count || 0} · Primer: {fmt(r.first)} · Último:{" "}
                  {fmt(r.last)}
                </div>

                <textarea
                  value={r.note}
                  onChange={(e) => updateNote(i, e.target.value)}
                  rows={3}
                  className={`w-full rounded-lg border p-2 text-sm ${
                    warn && isMissingNote(i)
                      ? "border-amber-300 focus:ring-2 focus:ring-amber-200"
                      : "border-slate-300"
                  }`}
                  placeholder="Nota obligatoria"
                />
              </div>
            );
          })}
        </section>

        <button
          onClick={onContinuar}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
