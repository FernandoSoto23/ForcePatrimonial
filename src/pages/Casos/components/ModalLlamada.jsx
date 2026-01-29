import { useState, useRef, useEffect } from "react";

export default function ModalLlamadaCabina({ abierto, evento, onColgar }) {
    const [agentCode, setAgentCode] = useState("");
    const [llamando, setLlamando] = useState(false);
    const [enLlamada, setEnLlamada] = useState(false);
    const [segundos, setSegundos] = useState(0);
    const [mute, setMute] = useState(false);

    const abortRef = useRef(null);
    const timerRef = useRef(null);

    // ===============================
    // TIMER DE LLAMADA
    // ===============================
    useEffect(() => {
        if (!enLlamada) return;

        timerRef.current = setInterval(() => {
            setSegundos((s) => s + 1);
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [enLlamada]);

    // Corte automático a los 60s
    useEffect(() => {
        if (segundos >= 60) {
            colgar();
        }
    }, [segundos]);

    // Reset al cerrar modal
    useEffect(() => {
        if (!abierto) {
            clearInterval(timerRef.current);
            setEnLlamada(false);
            setSegundos(0);
            setMute(false);
            setLlamando(false);
            setAgentCode("");
        }
    }, [abierto]);

    // ===============================
    // ACCIONES
    // ===============================
    const llamarCabina = async () => {
        if (!agentCode) {
            alert("Ingresa el código del agente");
            return;
        }

        setLlamando(true);
        abortRef.current = new AbortController();

        try {
            await fetch("https://agentpatsec.onrender.com/llamar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: abortRef.current.signal,
                body: JSON.stringify({
                    numero: evento?.telefono ?? "96681113366",
                    agentCode,
                }),
            });

            setEnLlamada(true);
            setSegundos(0);
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error al llamar cabina", error);
                alert("Error al iniciar la llamada");
            }
        } finally {
            setLlamando(false);
        }
    };

    const colgar = () => {
        clearInterval(timerRef.current);
        abortRef.current?.abort();
        setEnLlamada(false);
        setSegundos(0);
        onColgar?.();
    };

    const formatTime = (s) => `00:${s.toString().padStart(2, "0")}`;

    // ===============================
    // RENDER
    // ===============================
    return (
        <>
            {(!abierto || !evento) ? null : (
                <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-6">

                        {/* HEADER */}
                        <div className="text-center">
                            <div className="text-4xl mb-2">📞</div>
                            <h2 className="text-lg font-bold text-gray-800">
                                Llamada desde conmutador
                            </h2>
                            <p className="text-xs text-gray-500">
                                Evento #{evento.id}
                            </p>
                        </div>

                        {/* INFO */}
                        <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                            <p>
                                <strong>Unidad:</strong>{" "}
                                {evento.unidad ?? "—"}
                            </p>
                            <p className="mt-1">
                                <strong>Situación:</strong>{" "}
                                {evento.alertas?.join(", ") ??
                                    "No especificada"}
                            </p>
                        </div>

                        {/* TIMER */}
                        {enLlamada && (
                            <div className="mt-4 text-center text-xl font-mono text-green-600">
                                {formatTime(segundos)} / 01:00
                            </div>
                        )}

                        {/* INPUT AGENTE */}
                        {!enLlamada && (
                            <div className="mt-4">
                                <label className="text-xs font-semibold text-gray-600">
                                    Código de agente
                                </label>
                                <input
                                    type="text"
                                    value={agentCode}
                                    onChange={(e) =>
                                        setAgentCode(
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                    className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="FEF2EA"
                                />
                            </div>
                        )}

                        {/* CONTROLES */}
                        <div className="mt-6 space-y-3">

                            {enLlamada && (
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => setMute(!mute)}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                            mute
                                                ? "bg-yellow-500 text-white"
                                                : "bg-gray-200 text-gray-700"
                                        }`}
                                    >
                                        {mute ? "🔇 Muteado" : "🎤 Micrófono"}
                                    </button>
                                </div>
                            )}

                            {!enLlamada && (
                                <button
                                    onClick={llamarCabina}
                                    disabled={llamando}
                                    className="w-full py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                                >
                                    {llamando ? "Llamando…" : "Llamar"}
                                </button>
                            )}

                            <button
                                onClick={colgar}
                                className="w-full py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                            >
                                Colgar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}