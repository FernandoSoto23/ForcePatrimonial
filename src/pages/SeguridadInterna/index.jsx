import { useEffect, useState } from "react";
import AlertasTable from "./components/AlertasTable";
import { decodeJWT, isTokenValid } from "../../utils/jwt";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function SeguridadInterna() {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarAlertas = async () => {
            try {
                const token = localStorage.getItem("auth_token");

                if (!token || !isTokenValid(token)) {
                    console.error("❌ Token inválido o expirado");
                    setAlertas([]);
                    return;
                }

                const payload = decodeJWT(token);
                const idUsuario = payload.id_usuario || payload.id;

                if (!idUsuario) {
                    console.error("❌ El token no contiene id_usuario");
                    return;
                }
                const resp = await fetch(
                    `${API_URL}/alertas/alertas-activas-usuario?id_usuario=${idUsuario}`,
                    {   
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const data = await resp.json();
                setAlertas(data ?? []);
            } catch (e) {
                console.error("❌ Error cargando alertas", e);
            } finally {
                setLoading(false);
            }
        };

        cargarAlertas();
    }, []);

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-lg font-bold text-gray-900">
                    🔐 Seguridad Interna
                </h1>

                <span className="text-xs text-gray-500">
                    Consulta de alertas (solo lectura)
                </span>
            </div>

            <AlertasTable data={alertas} loading={loading} />
        </div>
    );
}
