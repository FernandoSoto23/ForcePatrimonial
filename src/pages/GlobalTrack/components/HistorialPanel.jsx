import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { FaMapMarkedAlt } from "react-icons/fa";

/* =========================
   HELPERS
========================= */
function getUnitName(u) {
    return (
        u?.nm || u?.name || u?.alias || u?.unidad ||
        u?.label || u?.device_name || `Unidad ${u?.id ?? ""}`
    );
}

function formatDuration(sec = 0) {
    const s = Math.max(0, Number(sec) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h ? `${h}h ` : ""}${m || 1}m`;
}

function formatTime(ts) {
    if (!ts) return "--:--";
    return new Date(ts * 1000).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit",
    });
}

function formatDateTime(ts) {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleString("es-MX", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function toInputDT(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
            const duration = (end.time ?? end.t ?? 0) - (start.time ?? start.t ?? 0);
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
    // ✅ NUEVA PROP: callback(point, index, total) para mover marcador en mapa
    onPlaybackPosition,
}) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [minStopTime, setMinStopTime] = useState(600);
    const [stopsOpen, setStopsOpen] = useState(false);
    const [internalSelectedStopIndex, setInternalSelectedStopIndex] = useState(null);
    const [closing, setClosing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── Reproductor ──────────────────────────────────────────────
    const [isPlaying, setIsPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [playSpeed, setPlaySpeed] = useState(3); // 1=muy lento … 10=rápido
    const [playerOpen, setPlayerOpen] = useState(false);
    const intervalRef = useRef(null);
    const playIndexRef = useRef(0);
    const playSpeedRef = useRef(3);

    // Nivel 1=muy lento … 10=rápido (usado por startPlayback via ref)

    const selectedStopIndex =
        externalSelectedStopIndex !== undefined
            ? externalSelectedStopIndex
            : internalSelectedStopIndex;

    const initializedRef = useRef(false);

    /* INIT FECHAS */
    useEffect(() => {
        if (!isOpen) { initializedRef.current = false; return; }
        if (initializedRef.current) return;
        const now = new Date();
        setFromDate(toInputDT(new Date(now.getTime() - 86400000)));
        setToDate(toInputDT(now));
        initializedRef.current = true;
    }, [isOpen]);

    /* PARADAS */
    const stops = useMemo(() => {
        if (!historyData.length) return [];
        return detectStops(historyData, minStopTime);
    }, [historyData, minStopTime]);

    useEffect(() => { onDrawStops?.(stops, selectedStopIndex); }, [stops, selectedStopIndex]);

    const handleStopClick = (i) => {
        onStopSelect ? onStopSelect(i) : setInternalSelectedStopIndex(i);
    };

    /* REPRODUCTOR */
    const validPoints = useMemo(() => historyData.filter(p =>
        Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon ?? p.lng))
    ), [historyData]);

    const currentPoint = validPoints[playIndex] ?? null;
    const progressPct = validPoints.length > 1 ? (playIndex / (validPoints.length - 1)) * 100 : 0;

    // Notificar al mapa — solo posición de la flecha, sin traza completa
    useEffect(() => {
        if (!currentPoint) return;
        onPlaybackPosition?.(currentPoint, playIndex, validPoints.length);
    }, [playIndex]);

    const stopPlayback = useCallback(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsPlaying(false);
    }, []);

    // Cuántos puntos saltar por tick según nivel 1-10
    // Nivel 1 → 1 punto/tick a 120ms = lento
    // Nivel 10 → 20 puntos/tick a 50ms = rápido pero sin freeze
    const speedToSkip = (level) => Math.max(1, Math.round((level - 1) * 2.1));
    const speedToInterval = (level) => level <= 3 ? 120 : level <= 6 ? 80 : 50;

    const startPlayback = useCallback(() => {
        if (!validPoints.length) return;
        if (playIndexRef.current >= validPoints.length - 1) {
            playIndexRef.current = 0;
            setPlayIndex(0);
        }
        clearInterval(intervalRef.current);

        const tick = () => {
            const skip = speedToSkip(playSpeedRef.current);
            const ms   = speedToInterval(playSpeedRef.current);
            playIndexRef.current = Math.min(playIndexRef.current + skip, validPoints.length - 1);
            setPlayIndex(playIndexRef.current);
            if (playIndexRef.current >= validPoints.length - 1) {
                clearInterval(intervalRef.current);
                setIsPlaying(false);
                return;
            }
            intervalRef.current = setTimeout(tick, ms);
        };

        const ms = speedToInterval(playSpeedRef.current);
        intervalRef.current = setTimeout(tick, ms);
        setIsPlaying(true);
    }, [validPoints]);

    // Cuando cambia velocidad — solo actualizar ref, el propio tick lo leerá
    useEffect(() => {
        playSpeedRef.current = playSpeed;
    }, [playSpeed]);

    // Cleanup
    useEffect(() => () => clearInterval(intervalRef.current), []);

    // Reset cuando llegan nuevos datos
    useEffect(() => {
        stopPlayback();
        setPlayIndex(0);
        playIndexRef.current = 0;
        if (validPoints.length > 0) setPlayerOpen(true);
    }, [historyData]);

    const handleSeek = (e) => {
        const idx = Math.round((Number(e.target.value) / 100) * (validPoints.length - 1));
        playIndexRef.current = idx;
        setPlayIndex(idx);
    };

    const skip = (direction) => {
        const step = Math.max(1, Math.round(validPoints.length * 0.05));
        const idx = Math.min(validPoints.length - 1, Math.max(0, playIndex + direction * step));
        playIndexRef.current = idx;
        setPlayIndex(idx);
    };

    /* CERRAR */
    const handleRequestClose = () => {
        if (historyData.length > 0) { setShowConfirm(true); return; }
        stopPlayback();
        onClearHistory?.();
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose?.(); }, 250);
    };

    if (!isOpen && !closing) return null;

    return (
        <>
            {/* Confirm modal */}
            {showConfirm && (
                <div style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <div style={{ background:"#fff",borderRadius:"14px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",width:"320px",padding:"20px",fontFamily:"system-ui,sans-serif" }}>
                        <h3 style={{ color:"#111827",fontWeight:700,marginBottom:"8px",fontSize:"15px" }}>⚠️ Cerrar historial</h3>
                        <p style={{ color:"#6b7280",fontSize:"13px",marginBottom:"16px",lineHeight:1.5 }}>
                            ¿Deseas cerrar el historial?<br/>La ruta y paradas se borrarán del mapa.
                        </p>
                        <div style={{ display:"flex",justifyContent:"flex-end",gap:"8px" }}>
                            <button onClick={() => setShowConfirm(false)} style={btnOutline}>Cancelar</button>
                            <button onClick={() => {
                                setShowConfirm(false); stopPlayback(); onClearHistory?.();
                                setClosing(true); setTimeout(() => { setClosing(false); onClose?.(); }, 250);
                            }} style={btnRed}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel principal */}
            <div style={{
                position:"absolute", top:"8px", left:"72px", zIndex:9999,
                width:"320px", maxHeight:"92vh",
                backgroundColor:"#ffffff", border:"1px solid #e5e7eb",
                borderRadius:"16px", boxShadow:"0 4px 24px rgba(0,0,0,0.12)",
                display:"flex", flexDirection:"column", overflow:"hidden",
                fontFamily:"system-ui,-apple-system,sans-serif",
                transform: closing ? "translateX(-16px)" : "translateX(0)",
                opacity: closing ? 0 : 1,
                transition:"transform 0.25s ease,opacity 0.25s ease",
            }}>

                {/* HEADER */}
                <div style={{ padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f3f4f6" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                        <FaMapMarkedAlt size={14} style={{ color:"#374151" }} />
                        <span style={{ fontWeight:700,fontSize:"15px",color:"#111827" }}>Historial de Ruta</span>
                    </div>
                    <button onClick={handleRequestClose} style={{ background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:"20px",lineHeight:1,padding:"2px" }}>×</button>
                </div>

                {/* FORM */}
                <div style={{ padding:"12px 14px",display:"flex",flexDirection:"column",gap:"8px",borderBottom:"1px solid #f3f4f6" }}>
                    <select style={inputStyle} value={selectedUnitId || ""} onChange={(e) => onSelectUnit?.(e.target.value)}>
                        <option value="">Selecciona unidad</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{getUnitName(u)}</option>)}
                    </select>
                    <label style={labelStyle}>Desde</label>
                    <input type="datetime-local" style={inputStyle} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <label style={labelStyle}>Hasta</label>
                    <input type="datetime-local" style={inputStyle} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    <select style={inputStyle} value={minStopTime} onChange={(e) => setMinStopTime(Number(e.target.value))}>
                        <option value={300}>Paradas ≥ 5 min</option>
                        <option value={600}>Paradas ≥ 10 min</option>
                        <option value={900}>Paradas ≥ 15 min</option>
                        <option value={1800}>Paradas ≥ 30 min</option>
                        <option value={3600}>Paradas ≥ 60 min</option>
                    </select>
                    <button
                        disabled={historyLoading}
                        onClick={() => onFetchHistory?.({
                            unitId: selectedUnitId,
                            from: Math.floor(new Date(fromDate).getTime() / 1000),
                            to: Math.floor(new Date(toDate).getTime() / 1000),
                        })}
                        style={{ padding:"10px",borderRadius:"10px",border:"none",background:historyLoading?"#e5e7eb":"#1d4ed8",color:historyLoading?"#9ca3af":"white",fontWeight:700,fontSize:"13px",cursor:historyLoading?"not-allowed":"pointer" }}
                    >
                        {historyLoading ? "⏳ Consultando..." : "🔍 Consultar historial"}
                    </button>
                </div>

                {/* ══════════════════════════════
                    REPRODUCTOR
                ══════════════════════════════ */}
                {validPoints.length > 0 && (
                    <div style={{ borderBottom:"1px solid #f3f4f6" }}>
                        {/* Header colapsable */}
                        <div onClick={() => setPlayerOpen(v => !v)} style={{
                            padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center",
                            cursor:"pointer", userSelect:"none", background:"#f0f7ff",
                            borderBottom: playerOpen ? "1px solid #dbeafe" : "none",
                        }}>
                            <span style={{ fontWeight:600,fontSize:"13px",color:"#1d4ed8",display:"flex",alignItems:"center",gap:"6px" }}>
                                ▶ Reproductor
                                {isPlaying && <span style={{ width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"blink 1s infinite" }}/>}
                            </span>
                            <span style={{ color:"#9ca3af",fontSize:"16px" }}>{playerOpen?"−":"+"}</span>
                        </div>

                        {playerOpen && (
                            <div style={{ padding:"12px 14px",display:"flex",flexDirection:"column",gap:"10px",background:"#fafcff" }}>

                                {/* Info punto actual */}
                                {currentPoint && (
                                    <div style={{ background:"#fff",border:"1px solid #dbeafe",borderRadius:"10px",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                                        <div>
                                            <div style={{ fontSize:"11px",color:"#6b7280" }}>{formatDateTime(currentPoint.time ?? currentPoint.t)}</div>
                                            <div style={{ fontSize:"12px",color:"#374151",fontWeight:600,marginTop:"2px" }}>
                                                Punto {playIndex + 1} / {validPoints.length}
                                            </div>
                                        </div>
                                        <div style={{
                                            padding:"4px 10px",borderRadius:"999px",fontWeight:700,fontSize:"12px",
                                            background: Number(currentPoint.speed??0) >= 10 ? "#dcfce7" : Number(currentPoint.speed??0) > 0 ? "#fef9c3" : "#fee2e2",
                                            color: Number(currentPoint.speed??0) >= 10 ? "#16a34a" : Number(currentPoint.speed??0) > 0 ? "#a16207" : "#dc2626",
                                        }}>
                                            {Number(currentPoint.speed ?? 0)} km/h
                                        </div>
                                    </div>
                                )}

                                {/* Seekbar */}
                                <div>
                                    <input
                                        type="range" min={0} max={100}
                                        value={progressPct.toFixed(1)}
                                        onChange={handleSeek}
                                        style={{ width:"100%",height:"4px",accentColor:"#1d4ed8",cursor:"pointer",margin:"4px 0" }}
                                    />
                                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#9ca3af" }}>
                                        <span>{formatTime(validPoints[0]?.time ?? validPoints[0]?.t)}</span>
                                        <span>{formatTime(validPoints[validPoints.length-1]?.time ?? validPoints[validPoints.length-1]?.t)}</span>
                                    </div>
                                </div>

                                {/* Controles play/pause */}
                                <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"10px" }}>
                                    <button onClick={() => skip(-1)} style={ctrlBtn} title="Retroceder 5%">⏮</button>

                                    <button
                                        onClick={() => isPlaying ? stopPlayback() : startPlayback()}
                                        style={{ width:"44px",height:"44px",borderRadius:"50%",border:"none",background:"#1d4ed8",color:"white",fontSize:"18px",cursor:"pointer",boxShadow:"0 2px 10px rgba(29,78,216,0.4)",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform 0.1s",flexShrink:0 }}
                                    >
                                        {isPlaying ? "⏸" : "▶"}
                                    </button>

                                    <button
                                        onClick={() => { stopPlayback(); setPlayIndex(0); playIndexRef.current = 0; }}
                                        style={ctrlBtn} title="Reiniciar"
                                    >⏹</button>

                                    <button onClick={() => skip(1)} style={ctrlBtn} title="Avanzar 5%">⏭</button>
                                </div>

                                {/* Velocidad */}
                                <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                                    <span style={{ fontSize:"11px",color:"#6b7280",whiteSpace:"nowrap" }}>Velocidad:</span>
                                    <input
                                        type="range" min={1} max={10} value={playSpeed}
                                        onChange={(e) => setPlaySpeed(Number(e.target.value))}
                                        style={{ flex:1,accentColor:"#1d4ed8",height:"3px",cursor:"pointer" }}
                                    />
                                    <span style={{ fontSize:"11px",color:"#1d4ed8",fontWeight:700,minWidth:"28px",textAlign:"right" }}>
                                        {playSpeed === 1 ? "×1" : playSpeed <= 3 ? "×2" : playSpeed <= 6 ? "×5" : playSpeed <= 8 ? "×10" : "×20"}
                                    </span>
                                </div>

                            </div>
                        )}
                    </div>
                )}

                {/* PARADAS */}
                <div style={{ flex:1,overflowY:"auto",padding:"10px 14px",backgroundColor:"#f9fafb" }}>
                    {stops.length === 0 ? (
                        <div style={{ textAlign:"center",padding:"20px 12px",color:"#9ca3af",fontSize:"12px",lineHeight:1.6 }}>
                            {historyData.length === 0 ? "Consulta un historial para ver las paradas" : "No hay paradas detectadas"}
                        </div>
                    ) : (
                        <div style={{ background:"#ffffff",borderRadius:"12px",overflow:"hidden",border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                            <div onClick={() => setStopsOpen(v => !v)} style={{ padding:"10px 14px",background:"#f9fafb",borderBottom:stopsOpen?"1px solid #e5e7eb":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",color:"#374151",fontSize:"13px",fontWeight:600,userSelect:"none" }}>
                                <span>⏸ Paradas ({stops.length})</span>
                                <span style={{ fontSize:"18px",color:"#9ca3af" }}>{stopsOpen?"−":"+"}</span>
                            </div>
                            {stopsOpen && (
                                <div style={{ maxHeight:"280px",overflowY:"auto" }}>
                                    {stops.map((s, i) => {
                                        const isSel = selectedStopIndex === i;
                                        return (
                                            <div key={i} onClick={() => handleStopClick(i)}
                                                style={{ padding:"10px 14px",borderTop:i>0?"1px solid #f3f4f6":"none",cursor:"pointer",background:isSel?"#fef9c3":"transparent",display:"flex",gap:"10px",alignItems:"flex-start",transition:"background 0.15s" }}
                                                onMouseEnter={(e) => { if(!isSel) e.currentTarget.style.background="#f9fafb"; }}
                                                onMouseLeave={(e) => { if(!isSel) e.currentTarget.style.background="transparent"; }}
                                            >
                                                <div style={{ width:"10px",height:"10px",borderRadius:"50%",marginTop:"3px",flexShrink:0,background:isSel?"#eab308":"#fbbf24",border:isSel?"2px solid #ca8a04":"2px solid #92400e",boxShadow:isSel?"0 0 6px #eab308":"none" }}/>
                                                <div style={{ flex:1 }}>
                                                    <div style={{ color:"#111827",fontWeight:600,fontSize:"13px" }}>⏸ Parada {formatDuration(s.duration)}</div>
                                                    <div style={{ color:"#6b7280",fontSize:"11px",marginTop:"3px" }}>{formatDateTime(s.from)}</div>
                                                    <div style={{ color:"#9ca3af",fontSize:"11px",marginTop:"1px" }}>hasta {formatTime(s.to)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ padding:"12px 14px",borderTop:"1px solid #e5e7eb",backgroundColor:"#ffffff" }}>
                    <button onClick={handleRequestClose} style={{ width:"100%",padding:"10px",borderRadius:"10px",border:"1px solid #fee2e2",background:"#fff1f2",color:"#dc2626",fontWeight:700,fontSize:"13px",cursor:"pointer" }}>
                        ✕ Cerrar historial
                    </button>
                </div>
            </div>

            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        </>
    );
}

const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:"10px",
    border:"1px solid #e5e7eb", background:"#f9fafb",
    color:"#111827", fontSize:"13px", outline:"none", boxSizing:"border-box",
};
const labelStyle = { color:"#6b7280",fontSize:"11px",fontWeight:600,marginBottom:"-4px",paddingLeft:"2px" };
const ctrlBtn = { width:"34px",height:"34px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"#f9fafb",color:"#374151",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 };
const btnOutline = { padding:"7px 14px",borderRadius:"8px",border:"1px solid #e5e7eb",color:"#374151",background:"#f9fafb",cursor:"pointer",fontSize:"13px" };
const btnRed = { padding:"7px 14px",borderRadius:"8px",border:"none",background:"#dc2626",color:"white",cursor:"pointer",fontWeight:700,fontSize:"13px" };
