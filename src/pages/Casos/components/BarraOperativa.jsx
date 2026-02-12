import React from "react";
import Swal from "sweetalert2";

function BarraOperativa({
    total,
    activos,
    criticos,
    onCrearAlerta,
    onRefrescarAlertas,
}) {

    const manejarCrearAlerta = async () => {
        const result = await Swal.fire({
            title: "Crear alerta manual",
            text: "¿Deseas generar una alerta manual?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, crear",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",
        });

        if (!result.isConfirmed) return;

        onCrearAlerta?.();
    };

    const manejarRestablecerServicio = async () => {
        const result = await Swal.fire({
            title: "Restablecer servicio",
            text: "Esto reiniciará el servicio del backend. ¿Continuar?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, reiniciar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#111827",
            cancelButtonColor: "#6b7280",
        });

        if (!result.isConfirmed) return;

        try {
            const resp = await fetch(
                "http://localhost:4000/servicio/restart",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await resp.json();

            if (!resp.ok || !data.ok) {
                throw new Error(data?.message || "Error reiniciando servicio");
            }

            await Swal.fire({
                icon: "success",
                title: "Servicio reiniciado",
                text: "El backend envió la orden de reinicio a Render.",
                confirmButtonColor: "#16a34a",
            });

        } catch (error) {
            console.error("❌ Error:", error);

            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo reiniciar el servicio.",
                confirmButtonColor: "#dc2626",
            });
        }
    };


    const manejarRefrescarAlertas = async () => {
        const result = await Swal.fire({
            title: "Refrescar alertas",
            text: "Esto volverá a consultar las alertas activas. ¿Continuar?",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Sí, refrescar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",
        });

        if (!result.isConfirmed) return;

        try {
            await onRefrescarAlertas?.();

            await Swal.fire({
                icon: "success",
                title: "Alertas actualizadas",
                text: "Se refrescaron las alertas activas.",
                confirmButtonColor: "#16a34a",
            });

        } catch (error) {
            console.error("❌ Error refrescando alertas:", error);

            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron refrescar las alertas.",
                confirmButtonColor: "#dc2626",
            });
        }
    };
    return (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-6 py-3 flex items-center justify-between">

                {/* IZQUIERDA */}
                <div className="flex items-center gap-6">
                    <h1 className="text-sm font-bold text-gray-800 tracking-wide">
                        Centro de Monitoreo
                    </h1>

                    <div className="h-5 w-px bg-gray-300" />

                    <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-600">
                            Total: <b>{total}</b>
                        </span>

                        <span className="text-emerald-600 font-semibold">
                            Activas: {activos}
                        </span>

                        <span className="text-gray-800 font-semibold">
                            Críticas: {criticos}
                        </span>
                    </div>
                </div>

                {/* DERECHA */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={manejarRefrescarAlertas}
                        className="
              px-4 py-1.5 text-xs font-semibold rounded-md
              bg-gray-100 text-gray-800
              hover:bg-gray-200
              transition
            "
                    >
                        🔄 Refrescar alertas
                    </button>
                    <button
                        onClick={manejarCrearAlerta}
                        className="
              px-4 py-1.5 text-xs font-semibold rounded-md
              bg-blue-600 text-white
              hover:bg-blue-700
              transition
            "
                    >
                        ➕ Crear alerta
                    </button>

                    <button
                        onClick={manejarRestablecerServicio}
                        className="
              px-4 py-1.5 text-xs font-semibold rounded-md
              bg-gray-800 text-white
              hover:bg-black
              transition
            "
                    >
                        🔄 Restablecer servicio
                    </button>

                </div>
            </div>
        </div>
    );
}

export default React.memo(BarraOperativa);
