import React, { useMemo, useState } from "react";
import {
  Siren,
  PhoneCall,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  ClipboardList,
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

export default function FlowRunnerBotonPanico() {
  const FLOW_NAME = "Botón de pánico";

  const NODES = {
    "1": {
      type: "action",
      title: "Botón de pánico",
      icon: <Siren size={16} />,
      details: [
        { id: "1-1", text: "CMS enlaza llamada a cabina modo espía" },
        {
          id: "1-2",
          text: "CMS escucha atentamente y toma nota de lo que se está conversando",
        },
        { id: "1-3", text: "CMS observa imagen de la plataforma Samsara" },
      ],
      options: [{ label: "Continuar", to: "2" }],
    },
    "2": {
      type: "decision",
      title: "¿Se visualiza riesgo o se escucha riesgo en cabina?",
      icon: <AlertTriangle size={16} />,
      details: [
        { id: "2-1", text: "Amenazas" },
        { id: "2-2", text: "Palabras altisonantes" },
        { id: "2-3", text: "Planes a desviar unidad" },
        { id: "2-4", text: "Planes de parar la unidad" },
        { id: "2-5", text: "Planes para bajar a la tripulación" },
        {
          id: "2-6",
          text: "Planes para atentar contra la integridad de la tripulación",
        },
      ],
      options: [
        { label: "Sí → Se realiza reporte ante las autoridades", to: "3" },
        { label: "No → Marcar al operador", to: "6" },
      ],
    },
    "3": {
      type: "action",
      title: "Se realiza reporte ante las autoridades",
      icon: <ShieldAlert size={16} />,
      details: [
        { id: "3-1", text: "Se marca a 088 y 911 ambas" },
        { id: "3-2", text: "Mandar comando de potenciómetro de la unidad" },
        {
          id: "3-3",
          text: "Solicitar apoyo de unidad de seguridad (si aplica)",
        },
      ],
      options: [{ label: "Continuar", to: "4" }],
    },
    "4": {
      type: "action",
      title: "Notificar",
      icon: <ClipboardCheck size={16} />,
      details: [
        {
          id: "4-1",
          text: "Publicar información del evento en el grupo de LAICA",
        },
        { id: "4-2", text: "Notificar a Torre de control" },
        { id: "4-3", text: "Notificar a Supervisor y Coordinador de CMS" },
        { id: "4-4", text: "Notificar a Seguridad Operativa" },
        { id: "4-5", text: "Notificar a Gerente de Seguridad Operativa" },
        {
          id: "4-6",
          text: "Notificar a logística respetando jerarquía",
        },
      ],
      options: [{ label: "Continuar", to: "5" }],
    },
    "5": {
      type: "action",
      title: "Enviar reporte",
      icon: <FileText size={16} />,
      details: [
        {
          id: "5-1",
          text: "Recabar información y generar reporte de investigación",
        },
      ],
      options: [{ label: "Finalizar", to: "fin" }],
    },
    "6": {
      type: "decision",
      title: "Marcar al operador",
      icon: <PhoneCall size={16} />,
      details: [
        { id: "6-0", text: "Confirmar comunicación con el operador" },
        { id: "6-1", text: "Nombre del operador" },
        { id: "6-2", text: "Número de ruta" },
        { id: "6-3", text: "Segmento" },
        { id: "6-4", text: "Nombre del compañero (si aplica)" },
        { id: "6-5", text: "Nombre del líder" },
        { id: "6-6", text: "Escuchar tono de voz del colaborador" },
      ],
      options: [
        { label: "Sí → Falsa alarma", to: "7" },
        { label: "No → Reporte a autoridades", to: "3" },
      ],
    },
    "7": {
      type: "action",
      title: "Reporte por falsa alarma",
      icon: <ClipboardList size={16} />,
      details: [
        { id: "7-1", text: "Enviar reporte a áreas involucradas" },
        {
          id: "7-2",
          text: "Recabar información y publicar reporte de investigación",
        },
      ],
      options: [{ label: "Finalizar", to: "fin" }],
    },
    fin: {
      type: "action",
      title: "Fin",
      icon: <ClipboardCheck size={16} />,
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
        if ((progress[sid]?.[d.id]?.entries?.length || 0) > 0) done += 1;
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
      const entry = {
        timestamp: Date.now(),
        note: det.draftNote || "",
      };

      return {
        ...prev,
        [sid]: {
          ...step,
          [did]: {
            entries: [...det.entries, entry],
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
      `historial_boton_panico_${new Date().toISOString().slice(0, 10)}.csv`,
      rows.join("\r\n")
    );
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-6 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Protocolo – Botón de pánico
          </h1>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full border bg-white">
              {countTotals.done}/{countTotals.total}
            </span>

            <button
              onClick={exportCSV}
              className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
            >
              <Download size={14} /> CSV
            </button>

            <button
              onClick={() => setStepId("1")}
              className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
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
            <span className="text-xs flex items-center gap-1">
              <CheckCircle2 size={14} /> {stepStats(stepId).done}/
              {stepStats(stepId).total}
            </span>
          </div>

          {/* Details */}
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
                        onClick={() => addCheck(stepId, d.id)}
                        className="text-xs px-3 py-1 rounded-full border"
                      >
                        <CheckCircle2 size={14} /> Check
                      </button>
                    </div>

                    <textarea
                      className="mt-2 w-full rounded-xl border p-2 text-sm bg-white"
                      rows={2}
                      value={dp.draftNote}
                      onChange={(e) =>
                        setDraftNote(stepId, d.id, e.target.value)
                      }
                      placeholder="Nota para este check"
                    />

                    {dp.entries.length > 0 && (
                      <button
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

          {/* Options */}
          <div className="mt-4 grid gap-2">
            {cur.options?.map((o, i) => (
              <button
                key={i}
                onClick={() => setStepId(o.to)}
                className="rounded-xl border bg-white px-3 py-2 text-left hover:bg-slate-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
