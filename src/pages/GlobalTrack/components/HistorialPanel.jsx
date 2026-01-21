"use client";

export default function HistorialPanel({
    mapRef,

    /* estado */
    open,
    historyUnitId,
    historyVisible,
    historyLoading,
    historyMessage,

    historyFrom,
    historyTo,
    historyDetectTrips,
    historyMinStopSec,

    historyAllPoints,
    stopsList,

    /* reproductor */
    playerPoints,
    playerIdx,
    playerPlaying,
    playerSpeed,
    playerFollowCam,
    playerTimeLabel,
    playerSpeedLabel,

    /* setters / acciones */
    setHistoryVisible,
    setHistoryFrom,
    setHistoryTo,
    setHistoryDetectTrips,
    setHistoryMinStopSec,

    setPlayerIdx,
    setPlayerPlaying,
    setPlayerSpeed,
    setPlayerFollowCam,

    consultarHistorial,
    borrarHistorial,
    exportHistoryCSV,
    fitToPoints,
    stopPlayer,

    onClose,
}) {
    if (!open) return null;

    return (
        <div
            className={[
                "fixed left-3 bottom-6 z-50 w-[390px] max-w-[94vw]",
                "max-h-[72vh] flex flex-col",
                "rounded-3xl backdrop-blur-xl",
                "bg-gradient-to-b from-black/70 to-black/55",
                "ring-1 ring-white/10 shadow-2xl",
                "overflow-hidden",
            ].join(" ")}
        >
            {/* ================= HEADER ================= */}
            <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                            🧾 Historial · Unidad #{historyUnitId ?? "—"}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="chip">Ruta</span>
                            <span className="chip">{historyVisible ? "Visible" : "Oculta"}</span>
                            {stopsList.length > 0 && <span className="chip">🛑 {stopsList.length}</span>}
                            {playerPoints.length > 0 && <span className="chip">🎞 {playerPoints.length}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setHistoryVisible((v) => !v)}
                            className="btn-icon"
                            title="Mostrar / Ocultar"
                        >
                            👁
                        </button>

                        <button onClick={onClose} className="btn-icon">
                            ✕
                        </button>
                    </div>
                </div>

                {/* FECHAS */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                        type="datetime-local"
                        value={historyFrom}
                        onChange={(e) => setHistoryFrom(e.target.value)}
                        className="input"
                    />
                    <input
                        type="datetime-local"
                        value={historyTo}
                        onChange={(e) => setHistoryTo(e.target.value)}
                        className="input"
                    />
                </div>

                {/* OPCIONES */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="box">
                        <span className="label">Detectar viajes</span>
                        <button
                            className="toggle"
                            onClick={() => setHistoryDetectTrips((v) => !v)}
                        >
                            {historyDetectTrips ? "ON" : "OFF"}
                        </button>
                    </div>

                    <div className="box">
                        <span className="label">
                            Parada mínima ({Math.round(historyMinStopSec / 60)} min)
                        </span>
                        <select
                            value={historyMinStopSec}
                            onChange={(e) => setHistoryMinStopSec(Number(e.target.value))}
                            className="input"
                        >
                            <option value={300}>5 min</option>
                            <option value={600}>10 min</option>
                            <option value={900}>15 min</option>
                            <option value={1800}>30 min</option>
                            <option value={3600}>60 min</option>
                        </select>
                    </div>
                </div>

                {/* BOTONES */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        disabled={historyLoading}
                        onClick={() => consultarHistorial(historyUnitId)}
                        className="btn-primary"
                    >
                        {historyLoading ? "Consultando…" : "✅ Consultar"}
                    </button>

                    <button onClick={borrarHistorial} className="btn-danger">
                        🗑 Borrar
                    </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                        disabled={!historyAllPoints.length}
                        onClick={() => exportHistoryCSV(historyAllPoints, historyUnitId)}
                        className="btn"
                    >
                        ⬇️ CSV
                    </button>

                    <button
                        disabled={!historyAllPoints.length}
                        onClick={() =>
                            fitToPoints(historyAllPoints.map((p) => ({ lat: p.lat, lon: p.lon })), 70)
                        }
                        className="btn"
                    >
                        🔎 Enfocar
                    </button>
                </div>

                {historyMessage && (
                    <div className="mt-2 text-[11px] text-white/70">
                        {historyMessage}
                    </div>
                )}
            </div>

            {/* ================= BODY ================= */}
            <div className="px-4 py-3 space-y-3 overflow-y-auto custom-scroll">
                {/* PARADAS */}
                <div className="card">
                    <div className="card-title">🛑 Paradas</div>

                    {stopsList.length === 0 ? (
                        <div className="text-xs text-white/60 px-2 py-2">
                            No hay paradas.
                        </div>
                    ) : (
                        stopsList.map((s, i) => (
                            <button
                                key={i}
                                className="item"
                                onClick={() =>
                                    mapRef.current?.easeTo({
                                        center: [s.lon, s.lat],
                                        zoom: 16,
                                        duration: 350,
                                    })
                                }
                            >
                                Parada {i + 1}
                            </button>
                        ))
                    )}
                </div>

                {/* ================= REPRODUCTOR ================= */}
                <div className="card">
                    <div className="card-title">🎞 Reproductor</div>

                    <div className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <button
                                disabled={!playerPoints.length}
                                onClick={() => setPlayerPlaying((v) => !v)}
                                className="btn-icon"
                            >
                                {playerPlaying ? "⏸" : "▶️"}
                            </button>

                            <button
                                disabled={!playerPoints.length}
                                onClick={() => {
                                    stopPlayer();
                                    setPlayerIdx(0);
                                }}
                                className="btn-icon"
                            >
                                ⏮
                            </button>

                            <div className="flex-1 text-xs text-white/70">
                                {playerTimeLabel}
                                <br />
                                {playerSpeedLabel}
                            </div>

                            <button
                                className="btn-icon"
                                onClick={() => setPlayerFollowCam((v) => !v)}
                            >
                                🎯
                            </button>
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={Math.max(0, playerPoints.length - 1)}
                            value={playerIdx}
                            onChange={(e) => {
                                const idx = Number(e.target.value);
                                stopPlayer();
                                setPlayerIdx(idx);
                                const p = playerPoints[idx];
                                if (p && mapRef.current) {
                                    mapRef.current.easeTo({
                                        center: [p.lon, p.lat],
                                        zoom: 16,
                                        duration: 200,
                                    });
                                }
                            }}
                            className="w-full"
                            disabled={!playerPoints.length}
                        />

                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={playerSpeed}
                            onChange={(e) => setPlayerSpeed(Number(e.target.value))}
                            className="w-full"
                            disabled={!playerPoints.length}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
