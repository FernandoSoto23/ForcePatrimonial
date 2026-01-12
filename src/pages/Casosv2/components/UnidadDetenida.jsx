import React, { useMemo, useState } from "react";
import {
  Truck,
  Eye,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  ClipboardList,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";

/* =========================
   UI Helpers
========================= */

function Card({ children, tone = "default" }) {
  const tones = {
    default: "bg-white border-slate-200",
    warning: "bg-amber-50 border-amber-200",
    success: "bg-emerald-50 border-emerald-200",
  };
  return (
    <div className={`rounded-2xl border ${tones[tone]} shadow-sm p-4`}>
      {children}
    </div>
  );
}

function StepHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
        {icon}
      </div>
      <div>
        <div className="font-medium leading-tight">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-600 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

/* =========================
   CSV Helpers
========================= */

function csvEscape(val) {
  const s = String(val ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* =========================
   Main Component
========================= */

export default function UnidadDetenida() {
  const FLOW_NAME = "Unidad detenida";

  const NODES = {
    "1": {
      type: "action",
      title: "Unidad detenida",
      icon: <Truck size={16} />,
      details: [
        { id: "1-1", text: "Visión de cámara en plataforma Samsara." },
        {
          id: "1-2",
          text: "Llamada en cabina modo espía (análisis de conversación).",
        },
      ],
      options: [{ label: "Continuar", to: "2" }],
    },
    "2": {
      type: "decision",
      title: "¿Se visualiza o escucha riesgo en cabina?",
      icon: <AlertTriangle size={16} />,
      details: [
        { id: "2-1", text: "Personas externas en cabina." },
        { id: "2-2", text: "Excedente de tripulación." },
        { id: "2-3", text: "Sin visión de cámara." },
        { id: "2-4", text: "Sin tripulación en cabina." },
        { id: "2-5", text: "Lenguaje altisonante." },
        { id: "2-6", text: "Amenazas a la tripulación." },
        { id: "2-7", text: "Intención de desvío o paro." },
        { id: "2-8", text: "Sin canal de escucha." },
      ],
      options: [
        { label: "Sí → Activar potenciómetro", to: "3" },
        {
          label:
            "No → Tripulación asignada sin novedad / conversación normal",
          to: "4",
        },
      ],
    },
    "3": {
      type: "action",
      title: "Activar potenciómetro",
      icon: <ShieldAlert size={16} />,
      details: [
        { id: "3-0", text: "Activar operativo 088 / 911." },
        { id: "3-1", text: "Notificar a Supervisor CMS en turno." },
        {
          id: "3-2",
          text: "Verificar unidad de seguridad disponible.",
        },
        { id: "3-3", text: "Informar a Coordinador CMS." },
        { id: "3-4", text: "Informar a Gerencia de Seguridad Operativa." },
        { id: "3-5", text: "Informar a Jefe de Seguridad de zona." },
        { id: "3-6", text: "Notificar a líder logístico." },
        { id: "3-7", text: "Notificar a Gerente regional." },
        { id: "3-8", text: "Notificar a Dirección de logística." },
        { id: "3-9", text: "Notificar a Torre de Control." },
      ],
      options: [{ label: "Ir al Paso 8", to: "8" }],
    },
    "4": {
      type: "decision",
      title: "Tripulación asignada sin novedad",
      icon: <Eye size={16} />,
      options: [
        { label: "Sí → Cuestionario de rutina", to: "5" },
        { label: "No → Validar con Torre de Control", to: "6" },
      ],
    },
    "5": {
      type: "decision",
      title: "Cuestionario de rutina a tripulación",
      icon: <ClipboardList size={16} />,
      details: [
        {
          id: "5-1",
          text: "Estado tranquilo, conversación normal.",
        },
      ],
      options: [
        { label: "Sí → Reporte por falsa alarma", to: "8" },
        { label: "No → Validar con Torre de Control", to: "6" },
      ],
    },
    "6": {
      type: "action",
      title: "Validar información con Torre de Control",
      icon: <Building2 size={16} />,
      details: [
        { id: "6-1", text: "Líder logístico." },
        { id: "6-2", text: "Gerente regional." },
        { id: "6-3", text: "Dirección de logística." },
      ],
      options: [{ label: "Continuar", to: "7" }],
    },
    "7": {
      type: "decision",
      title: "Equipo Logística / TC",
      icon: <ClipboardCheck size={16} />,
      details: [
        {
          id: "7-1",
          text: "Confirman movimiento del operador en ≤ 3 minutos.",
        },
      ],
      options: [
        { label: "Sí → Reporte por falsa alarma", to: "8" },
        { label: "No → Volver al Paso 1", to: "1" },
      ],
    },
    "8": {
      type: "action",
      title: "Mandar informe preliminar",
      icon: <FileText size={16} />,
      details: [{ id: "8-1", text: "Fin" }],
      options: [{ label: "Reiniciar", to: "1" }],
    },
  };

  const [stepId, setStepId] = useState("1");
  const [progress, setProgress] = useState({});
  const [expanded, setExpanded] = useState({});

  const cur = NODES[stepId];
  const allStepIds = useMemo(() => Object.keys(NODES), []);

  const countTotals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const sid of allStepIds) {
      const dets = NODES[sid].details || [];
      total += dets.length;
      for (const d of dets) {
        if ((progress[sid]?.[d.id]?.entries?.length || 0) > 0) {
          done += 1;
        }
      }
    }
    return { total, done };
  }, [progress, allStepIds]);

  const fmtLocal = (ts) =>
    ts ? new Date(ts).toLocaleString() : "—";

  const addCheck = (sid, did) => {
    setProgress((prev) => {
      const step = prev[sid] || {};
      const det = step[did] || { entries: [], draftNote: "" };

      return {
        ...prev,
        [sid]: {
          ...step,
          [did]: {
            entries: [
              ...det.entries,
              { timestamp: Date.now(), note: det.draftNote || "" },
            ],
            draftNote: "",
          },
        },
      };
    });
  };

  const setDraftNote = (sid, did, note) => {
    setProgress((prev) => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || {}),
        [did]: {
          entries: prev[sid]?.[did]?.entries || [],
          draftNote: note,
        },
      },
    }));
  };

  const toggleExpand = (key) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const stepStats = (sid) => {
    const dets = NODES[sid].details || [];
    const total = dets.length;
    const done = dets.filter(
      (d) => (progress[sid]?.[d.id]?.entries?.length || 0) > 0
    ).length;
    return { done, total, allDone: total > 0 && done === total };
  };

  const exportCSV = () => {
    const headers = [
      "flow",
      "stepId",
      "stepTitle",
      "detailId",
      "detailText",
      "checkIndex",
      "timestampISO",
      "timestampLocal",
      "note",
    ];

    const rows = [];
    rows.push(headers.map(csvEscape).join(","));

    for (const sid of allStepIds) {
      const step = NODES[sid];
      const dets = step.details || [];
      for (const d of dets) {
        const ent = progress[sid]?.[d.id]?.entries || [];
        ent.forEach((e, idx) => {
          rows.push(
            [
              FLOW_NAME,
              sid,
              step.title,
              d.id,
              d.text,
              idx + 1,
              new Date(e.timestamp).toISOString(),
              fmtLocal(e.timestamp),
              e.note || "",
            ]
              .map(csvEscape)
              .join(",")
          );
        });
      }
    }

    downloadCSV(
      `historial_unidad_detenida_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      rows.join("\r\n")
    );
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-6 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
              <Truck size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Protocolo – Unidad detenida
              </h1>
              <p className="text-xs text-slate-500">
                Histórico de checks por detalle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 rounded-full border bg-white">
              {countTotals.done}/{countTotals.total}
            </span>

            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
              onClick={exportCSV}
            >
              <Download size={14} /> CSV
            </button>

            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
              onClick={() => setStepId("1")}
            >
              Reiniciar
            </button>
          </div>
        </header>

        <Card tone={cur.type === "decision" ? "warning" : "default"}>
          <div className="flex items-center justify-between">
            <StepHeader
              icon={cur.icon}
              title={`Paso ${stepId}: ${cur.title}`}
            />
            <span className="text-xs inline-flex items-center gap-1">
              <CheckCircle2 size={14} /> {stepStats(stepId).done}/
              {stepStats(stepId).total}
            </span>
          </div>

          {cur.details && (
            <div className="mt-4 space-y-3">
              {cur.details.map((d) => {
                const dp =
                  progress[stepId]?.[d.id] || {
                    entries: [],
                    draftNote: "",
                  };
                const key = `${stepId}-${d.id}`;
                const open = expanded[key];

                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border p-3 bg-white ${
                      dp.entries.length
                        ? "border-emerald-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="text-sm">{d.text}</div>

                      <button
                        type="button"
                        onClick={() => addCheck(stepId, d.id)}
                        className="text-xs px-3 py-1 rounded-full border"
                      >
                        <CheckCircle2 size={14} /> Check
                      </button>
                    </div>

                    <textarea
                      className="mt-2 w-full rounded-xl border p-2 text-sm bg-white text-slate-900"
                      rows={2}
                      value={dp.draftNote}
                      onChange={(e) =>
                        setDraftNote(stepId, d.id, e.target.value)
                      }
                      placeholder="Nota para este check"
                    />

                    {dp.entries.length > 0 && (
                      <button
                        type="button"
                        className="mt-1 text-xs underline"
                        onClick={() => toggleExpand(key)}
                      >
                        {open ? "Ocultar historial" : "Ver historial"}
                      </button>
                    )}

                    {open && (
                      <div className="mt-2 text-xs space-y-1">
                        {dp.entries.map((e, i) => (
                          <div key={i}>
                            {fmtLocal(e.timestamp)} —{" "}
                            {e.note || "(sin nota)"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {cur.options?.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStepId(o.to)}
                className="rounded-xl border bg-white px-3 py-2 text-left hover:bg-slate-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-xs text-slate-500 mb-2">Saltar a:</div>
          <div className="flex flex-wrap gap-2">
            {allStepIds.map((id) => {
              const st = stepStats(id);
              const active = id === stepId;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStepId(id)}
                  className={`px-3 py-1 rounded-full border text-xs inline-flex items-center gap-2 ${
                    active
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white hover:bg-slate-50"
                  }`}
                  title={`${st.done}/${st.total} con ≥1 check`}
                >
                  {st.allDone ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  Paso {id}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
