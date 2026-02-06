import { normalize } from "../../Casos/utils/mensajes";
import { useMemo, useState } from "react";
/* ==========================
COMPONENTE PRINCIPAL
========================== */

export default function AlertasTable({ data, loading }) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const [filtroUnidad, setFiltroUnidad] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroMonitorista, setFiltroMonitorista] = useState("");
    const [filtroMotivo, setFiltroMotivo] = useState("");
    if (loading) {
        return (
            <div className="text-sm text-gray-500">
                Cargando historial de alertas…
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-sm text-gray-500">
                No hay historial de alertas para este usuario
            </div>
        );
    }
    function obtenerColumnasEvaluacion(data) {
        const set = new Set();

        data.forEach(a => {
            try {
                if (typeof a.detalle_cierre === "string") {
                    const d = JSON.parse(a.detalle_cierre);
                    const evalOp = d?.evaluacionOperativa;

                    if (evalOp) {
                        Object.keys(evalOp).forEach(k => set.add(k));
                    }
                }
            } catch { }
        });

        return Array.from(set);
    }
    function labelEvaluacion(key) {
        const labels = {
            revisionCCTV: "Revisión CCTV",
            contactoOperador: "Contacto operador",
            accionesRecuperacion: "Acciones recuperación",
            seguimientoSinSenal: "Seguimiento sin señal",
            operativoAutoridades: "Operativo autoridades"
        };

        if (labels[key]) return labels[key];

        // fallback automático: usa la llave tal cual viene
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, c => c.toUpperCase());
    }

    const columnasEvaluacion = obtenerColumnasEvaluacion(data);
    const dataFiltrada = useMemo(() => {
        return data.filter(a => {
            const detalle = (() => {
                try {
                    return typeof a.detalle_cierre === "string"
                        ? JSON.parse(a.detalle_cierre)
                        : null;
                } catch {
                    return null;
                }
            })();

            return (
                (!filtroUnidad || a.unidad?.toLowerCase().includes(filtroUnidad.toLowerCase())) &&
                (!filtroTipo || a.tipo === filtroTipo) &&
                (!filtroMonitorista || a.nombre_usuario === filtroMonitorista) &&
                (!filtroMotivo || detalle?.motivo === filtroMotivo)
            );
        });
    }, [data, filtroUnidad, filtroTipo, filtroMonitorista, filtroMotivo]);

    const totalPaginas = Math.ceil(dataFiltrada.length / pageSize);

    const dataPaginada = useMemo(() => {
        const start = (page - 1) * pageSize;
        return dataFiltrada.slice(start, start + pageSize);
    }, [dataFiltrada, page, pageSize]);
    return (
        <div className="overflow-x-auto bg-white border rounded-lg shadow">
            <div className="flex flex-wrap gap-3 p-3 border-b bg-gray-50 text-xs">

                <input
                    className="border rounded px-2 py-1"
                    placeholder="Unidad"
                    value={filtroUnidad}
                    onChange={e => {
                        setFiltroUnidad(e.target.value);
                        setPage(1);
                    }}
                />

                <select
                    className="border rounded px-2 py-1"
                    value={filtroTipo}
                    onChange={e => {
                        setFiltroTipo(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Todos los tipos</option>
                    {[...new Set(data.map(a => a.tipo))].map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select
                    className="border rounded px-2 py-1"
                    value={filtroMonitorista}
                    onChange={e => {
                        setFiltroMonitorista(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Todos los monitoristas</option>
                    {[...new Set(data.map(a => a.nombre_usuario).filter(Boolean))].map(u => (
                        <option key={u} value={u}>{u}</option>
                    ))}
                </select>

                <select
                    className="border rounded px-2 py-1"
                    value={filtroMotivo}
                    onChange={e => {
                        setFiltroMotivo(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Todos los motivos</option>
                    {[...new Set(data.map(a => {
                        try {
                            return JSON.parse(a.detalle_cierre)?.motivo;
                        } catch {
                            return null;
                        }
                    }).filter(Boolean))].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                <select
                    className="border rounded px-2 py-1 ml-auto"
                    value={pageSize}
                    onChange={e => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                    }}
                >
                    {[10, 25, 50, 100].map(n => (
                        <option key={n} value={n}>
                            {n} registros
                        </option>
                    ))}
                </select>
            </div>

            <table className="min-w-max text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr>
                        <Th>ID</Th>
                        <Th>Unidad</Th>
                        <Th>Tipo</Th>
                        <Th>Monitorista</Th>
                        <Th>Fecha incidente</Th>
                        <Th>Hora incidente</Th>
                        <Th>Geocerca</Th>
                        <Th>Motivo</Th>

                        {/* Evaluación operativa */}
                        {columnasEvaluacion.map(key => (
                            <Th key={key}>
                                {labelEvaluacion(key)}
                            </Th>
                        ))}

                        {/* SLA */}
                        <Th>Inicio atención</Th>
                        <Th>Fin atención</Th>
                        <Th>Tiempo respuesta</Th>

                        <Th>Mensaje</Th>
                    </tr>
                </thead>

                <tbody>
                    {dataPaginada.map((a) => {
                        let detalle = null;
                        let evalOp = null;
                        let tiempo = null;

                        try {
                            if (typeof a.detalle_cierre === "string") {
                                detalle = JSON.parse(a.detalle_cierre);
                                evalOp = detalle?.evaluacionOperativa;
                                tiempo = calcularTiempoRespuesta(evalOp, a);
                            }
                        } catch { }

                        return (
                            <tr
                                key={a.id}
                                className="border-t hover:bg-gray-50"
                            >
                                <Td>{a.id}</Td>

                                <Td className="font-semibold">
                                    {a.unidad}
                                </Td>

                                <Td className="uppercase text-blue-700">
                                    {normalize(a.tipo)}
                                </Td>
                                <Td>{a.nombre_usuario || "—"}</Td>
                                <Td>{fmtFecha(a.fecha_incidente)}</Td>

                                <Td>{fmtHora(a.hora_incidente)}</Td>
                                <Td>{a.geocerca_slta || "—"}</Td>
                                <Td>
                                    {detalle?.motivo || "—"}
                                </Td>
                                {/* Evaluación operativa */}
                                {columnasEvaluacion.map(key => (
                                    <Td key={key}>
                                        {fmtRespuesta(evalOp?.[key])}
                                    </Td>
                                ))}

                                {/* SLA */}
                                <Td>
                                    {tiempo?.inicio
                                        ? fmtFechaHora(tiempo.inicio)
                                        : "—"}
                                </Td>

                                <Td>
                                    {tiempo?.fin
                                        ? fmtFechaHora(tiempo.fin)
                                        : "—"}
                                </Td>

                                <Td className="font-semibold">
                                    {tiempo?.texto || "—"}
                                </Td>

                                <Td
                                    className="max-w-[420px] truncate"
                                    title={a.mensaje}
                                >
                                    {a.mensaje}
                                </Td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="flex justify-between items-center p-3 text-xs text-gray-600">
                <span>
                    Página {page} de {totalPaginas} · {dataFiltrada.length} registros
                </span>

                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-2 py-1 border rounded disabled:opacity-40"
                    >
                        ← Anterior
                    </button>

                    <button
                        disabled={page === totalPaginas}
                        onClick={() => setPage(p => p + 1)}
                        className="px-2 py-1 border rounded disabled:opacity-40"
                    >
                        Siguiente →
                    </button>
                </div>
            </div>

        </div>
    );
}

/* ==========================
HELPERS
========================== */

function fmtRespuesta(obj) {
    if (!obj) return "—";

    if (obj.respuesta === true) {
        return (
            <span className="text-emerald-600 font-semibold">
                Sí
            </span>
        );
    }

    if (obj.respuesta === false) {
        return (
            <span className="text-red-600 font-semibold">
                No
            </span>
        );
    }

    return "—";
}

function calcularTiempoRespuesta(evaluacionOperativa, alerta) {
    if (!evaluacionOperativa) return null;

    const horasInicio = Object.values(evaluacionOperativa)
        .map(a => a?.horaEjecucion)
        .filter(Boolean)
        .map(h => new Date(h).getTime());

    if (horasInicio.length === 0) return null;

    const inicio = Math.min(...horasInicio);

    // 🔐 cierre real del caso
    const cierreISO =
        alerta?.detalle_cierre &&
        (() => {
            try {
                const d = JSON.parse(alerta.detalle_cierre);
                return d?.fechaCierreISO;
            } catch {
                return null;
            }
        })();

    const finFecha = cierreISO || alerta.fecha_cierre;
    if (!finFecha) return null;

    const fin = new Date(finFecha).getTime();

    const diffMs = fin - inicio;
    const diffSeg = Math.floor(diffMs / 1000);
    const min = Math.floor(diffSeg / 60);
    const seg = diffSeg % 60;

    return {
        inicio: new Date(inicio),
        fin: new Date(fin),
        texto: `${min}m ${seg}s`
    };
}


function fmtFecha(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
}

function fmtHora(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString();
}

function fmtFechaHora(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
}

function Th({ children }) {
    return (
        <th className="px-3 py-2 border-b text-left font-semibold text-gray-700 whitespace-nowrap">
            {children}
        </th>
    );
}

function Td({ children, className = "" }) {
    return (
        <td className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>
            {children}
        </td>
    );
}
