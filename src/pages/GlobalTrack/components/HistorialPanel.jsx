import { useState, useEffect, useMemo, useRef } from "react";
import { FaTimes, FaMapMarkedAlt } from "react-icons/fa";

/* =========================
   HELPERS
========================= */
function getUnitName(u) {
    return (
        u?.nm ||
        u?.name ||
        u?.alias ||
        u?.unidad ||
        u?.label ||
        u?.device_name ||
        `Unidad ${u?.id ?? ""}`
    );
}

function formatDuration(sec = 0) {
    const s = Math.max(0, Number(sec) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h ? `${h}h ` : ""}${m || 1}m`;
}

function toInputDT(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

/* =========================
   DETECTAR PARADAS
========================= */
function detectStops(points = [], minStopSeconds = 600) {
    const stops = [];
    let startIndex = null;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const speed = Number(p.speed ?? p.sp ?? 0);

        if (speed <= 2) {
            if (startIndex === null) startIndex = i;
        } else if (startIndex !== null) {
            const start = points[startIndex];
            const end = p;
            const duration =
                (end.time ?? end.t ?? 0) - (start.time ?? start.t ?? 0);

            if (duration >= minStopSeconds) {
                stops.push({
                    lat: Number(start.lat),
                    lon: Number(start.lon ?? start.lng),
                    from: start.time,
                    to: end.time,
                    duration,
                });
            }
            startIndex = null;
        }
    }
    return stops;
}

/* =========================
   COMPONENT
========================= */
export default function HistorialPanel({
    isOpen,
    onClose,
    units = [],
    selectedUnitId,
    onSelectUnit,
    onFetchHistory,
    historyData = [],
    historyLoading = false,
    onDrawStops,
}) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [minStopTime, setMinStopTime] = useState(600);
    const [stopsOpen, setStopsOpen] = useState(true);
    const [selectedStopIndex, setSelectedStopIndex] = useState(null);

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            initializedRef.current = false;
            return;
        }
        if (initializedRef.current) return;

        const now = new Date();
        const y = new Date(now.getTime() - 86400000);
        setFromDate(toInputDT(y));
        setToDate(toInputDT(now));
        initializedRef.current = true;
    }, [isOpen]);

    const stops = useMemo(() => {
        if (!historyData.length) return [];
        return detectStops(historyData, minStopTime);
    }, [historyData, minStopTime]);

    useEffect(() => {
        onDrawStops?.(stops, selectedStopIndex);
    }, [stops, selectedStopIndex, onDrawStops]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-2 left-20 z-[9999] w-[320px] max-h-[90vh] bg-slate-100 shadow-2xl flex flex-col overflow-hidden rounded-2xl">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-3 flex justify-between">
                <div className="flex items-center gap-2">
                    <FaMapMarkedAlt />
                    <span className="font-bold">Historial de Ruta</span>
                </div>
                <button onClick={onClose}>
                    <FaTimes />
                </button>
            </div>

            {/* FORM */}
            <div className="p-3 space-y-3 bg-white border-b">
                <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={selectedUnitId || ""}
                    onChange={(e) => onSelectUnit?.(e.target.value)}
                >
                    <option value="">Selecciona unidad</option>
                    {units.map((u) => (
                        <option key={u.id} value={u.id}>
                            {getUnitName(u)}
                        </option>
                    ))}
                </select>

                <input
                    type="datetime-local"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                />

                <input
                    type="datetime-local"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                />

                <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={minStopTime}
                    onChange={(e) => setMinStopTime(Number(e.target.value))}
                >
                    <option value={300}>5 minutos</option>
                    <option value={600}>10 minutos</option>
                    <option value={900}>15 minutos</option>
                    <option value={1800}>30 minutos</option>
                    <option value={3600}>60 minutos</option>
                </select>

                <button
                    disabled={historyLoading}
                    onClick={() =>
                        onFetchHistory?.({
                            unitId: selectedUnitId,
                            from: Math.floor(new Date(fromDate).getTime() / 1000),
                            to: Math.floor(new Date(toDate).getTime() / 1000),
                        })
                    }
                    className="w-full bg-green-600 text-white rounded-lg py-2 font-semibold"
                >
                    {historyLoading ? "Consultando..." : "Consultar historial"}
                </button>
            </div>

            {/* PARADAS */}
            <div className="flex-1 p-3 overflow-y-auto">
                {stops.length === 0 ? (
                    <div className="text-sm text-slate-500">
                        No hay paradas (o el mínimo es alto).
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl">
                        <div
                            className="px-3 py-2 font-semibold bg-slate-50 border-b flex justify-between items-center cursor-pointer"
                            onClick={() => setStopsOpen((v) => !v)}
                        >
                            <span>Paradas detectadas ({stops.length})</span>
                            <span>{stopsOpen ? "−" : "+"}</span>
                        </div>

                        {stopsOpen && (
                            <table className="w-full text-xs">
                                <tbody>
                                    {stops.map((s, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => setSelectedStopIndex(i)}
                                            className={[
                                                "border-t cursor-pointer",
                                                selectedStopIndex === i
                                                    ? "bg-yellow-100"
                                                    : "hover:bg-slate-50",
                                            ].join(" ")}
                                        >
                                            <td className="p-2">
                                                ⏱ {formatDuration(s.duration)}
                                                <br />
                                                <span className="text-slate-500">
                                                    {new Date(s.from * 1000).toLocaleString("es-MX")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
