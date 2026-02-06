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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
                    from: start.time ?? start.t,
                    to: end.time ?? end.t,
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
    onStopSelect,
    selectedStopIndex: externalSelectedStopIndex,
    onClearHistory,
}) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [minStopTime, setMinStopTime] = useState(600);
    const [stopsOpen, setStopsOpen] = useState(true);

    const [internalSelectedStopIndex, setInternalSelectedStopIndex] =
        useState(null);

    const selectedStopIndex =
        externalSelectedStopIndex !== undefined
            ? externalSelectedStopIndex
            : internalSelectedStopIndex;

    const [closing, setClosing] = useState(false);

    // 🔴 SOLO PARA REEMPLAZAR window.confirm
    const [showConfirm, setShowConfirm] = useState(false);

    const initializedRef = useRef(false);

    /* =========================
       INIT FECHAS
    ========================= */
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

    /* =========================
       PARADAS
    ========================= */
    const stops = useMemo(() => {
        if (!historyData.length) return [];
        return detectStops(historyData, minStopTime);
    }, [historyData, minStopTime]);

    useEffect(() => {
        onDrawStops?.(stops, selectedStopIndex);
    }, [stops, selectedStopIndex, onDrawStops]);

    const handleStopClick = (stopIndex) => {
        if (onStopSelect) {
            onStopSelect(stopIndex);
        } else {
            setInternalSelectedStopIndex(stopIndex);
        }
    };

    /* =========================
       CERRAR (ALERTA ADAPTADA)
    ========================= */
    const handleRequestClose = () => {
        if (historyData.length > 0) {
            setShowConfirm(true);
            return;
        }

        onClearHistory?.();
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose?.();
        }, 250);
    };

    if (!isOpen && !closing) return null;

    return (
        <>
            {showConfirm && (
                <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl w-[360px] p-5">
                        <h3 className="font-bold text-gray-800 mb-2">
                            ⚠️ Cerrar historial
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            ¿Deseas cerrar el historial?
                            <br />
                            La ruta y paradas se borrarán del mapa.
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-3 py-1.5 rounded border text-gray-600 hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    onClearHistory?.();
                                    setClosing(true);
                                    setTimeout(() => {
                                        setClosing(false);
                                        onClose?.();
                                    }, 250);
                                }}
                                className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={`
        absolute top-2 left-20 z-[9999] w-[320px] max-h-[90vh]
        bg-neutral-300 shadow-2xl flex flex-col overflow-hidden rounded-2xl
        transform transition-all duration-300 ease-out
        ${closing ? "-translate-x-6 opacity-0" : "translate-x-0 opacity-100"}
      `}
            >
                {/* HEADER */}
                <div className="bg-gradient-to-r from-slate-500 to-slate-800 text-white px-4 py-3 flex justify-between">
                    <div className="flex items-center gap-2">
                        <FaMapMarkedAlt />
                        <span className="font-bold">Historial de Ruta</span>
                    </div>
                    <button onClick={handleRequestClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* FORM */}
                <div className="p-3 space-y-3 bg-s-300 border-b">
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
                        onChange={(e) =>
                            setMinStopTime(Number(e.target.value))
                        }
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
                                from: Math.floor(
                                    new Date(fromDate).getTime() / 1000
                                ),
                                to: Math.floor(
                                    new Date(toDate).getTime() / 1000
                                ),
                            })
                        }
                        className="w-full bg-green-800 text-white rounded-lg py-2 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {historyLoading
                            ? "Consultando..."
                            : "Consultar historial"}
                    </button>
                </div>

                {/* PARADAS */}
                <div className="flex-1 p-3 overflow-y-auto">
                    {stops.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-4">
                            {historyData.length === 0
                                ? "Consulta un historial para ver las paradas"
                                : "No hay paradas detectadas con el tiempo mínimo seleccionado"}
                        </div>
                    ) : (
                        <div className="bg-white border rounded-xl overflow-hidden">
                            <div
                                className="px-3 py-2 font-semibold bg-slate-50 border-b flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => setStopsOpen((v) => !v)}
                            >
                                <span>
                                    Paradas detectadas ({stops.length})
                                </span>
                                <span className="text-lg">
                                    {stopsOpen ? "−" : "+"}
                                </span>
                            </div>

                            {stopsOpen && (
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {stops.map((s, i) => {
                                                const isSelected =
                                                    selectedStopIndex === i;

                                                return (
                                                    <tr
                                                        key={i}
                                                        onClick={() =>
                                                            handleStopClick(i)
                                                        }
                                                        className={`
                                                        border-t cursor-pointer transition-all
                                                        ${isSelected
                                                                ? "bg-yellow-200 shadow-inner"
                                                                : "hover:bg-slate-50"
                                                            }
                                                    `}
                                                    >
                                                        <td className="p-3">
                                                            <div className="flex items-start gap-2">
                                                                <div
                                                                    className={`
                                                                w-3 h-3 rounded-full mt-1 flex-shrink-0
                                                                ${isSelected
                                                                            ? "bg-yellow-400 border-2 border-yellow-600 animate-pulse"
                                                                            : "bg-yellow-300 border-2 border-gray-700"
                                                                        }
                                                            `}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-gray-800">
                                                                        ⏸ Parada{" "}
                                                                        {formatDuration(
                                                                            s.duration
                                                                        )}
                                                                    </div>
                                                                    <div className="text-slate-500 mt-1">
                                                                        {new Date(
                                                                            s.from *
                                                                            1000
                                                                        ).toLocaleString(
                                                                            "es-MX",
                                                                            {
                                                                                day: "2-digit",
                                                                                month: "2-digit",
                                                                                year: "numeric",
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                            }
                                                                        )}
                                                                    </div>
                                                                    <div className="text-slate-400 text-[10px] mt-0.5">
                                                                        hasta{" "}
                                                                        {new Date(
                                                                            s.to *
                                                                            1000
                                                                        ).toLocaleTimeString(
                                                                            "es-MX",
                                                                            {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                            }
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* BOTÓN CERRAR */}
                <div className="p-3 bg-neutral-300">
                    <button
                        onClick={handleRequestClose}
                        className="w-full bg-red-800 hover:bg-red-700 text-white rounded-lg py-2 font-semibold transition-colors"
                    >
                        Cerrar historial
                    </button>
                </div>
            </div>
        </>
    );
}
