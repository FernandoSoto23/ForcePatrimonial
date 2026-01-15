import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
    BASE_GEOFENCES_L,
    BASE_GEOFENCES_A,
    BASE_GEOFENCES_T,
    GEOFENCES_L,
    GEOFENCES_A,
    GEOFENCES_T,
    PREDEFINED_GROUPS,
    BASE_GEOFENCES
} from "./geocercas";

/* ======================= CONFIG ======================= */

const GEOCERCAS_PERMITIDAS = new Set([
    ...BASE_GEOFENCES,
    ...BASE_GEOFENCES.map((n) => `${n} ext`),
    ...BASE_GEOFENCES.map((n) => `${n} ext.`),
]);

const API = "https://wialon-geocercas-api.georcercaswialon.workers.dev";
const MAX_AGE_MIN = 15;
const MAX_AGE_SEC = MAX_AGE_MIN * 60;
const CHUNK_SIZE = 150;

/* ======================= UTILS ======================= */

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

const fmtDT = (unix) =>
    !unix
        ? "—"
        : new Date(unix * 1000)
            .toISOString()
            .slice(0, 16)
            .replace("T", " ");

function formatHoraActual() {
    return new Date().toLocaleTimeString("es-MX", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

/* ======================= LOGIC ======================= */

function hasSignal(row) {
    if (!row.t) return false;
    const nowSec = Date.now() / 1000;
    return nowSec - row.t <= MAX_AGE_SEC;
}

function isSucursalGeofence(name) {
    const raw = name.trim();
    const clean = raw.replace(/\.$/, "");
    return (
        GEOCERCAS_PERMITIDAS.has(clean) ||
        GEOCERCAS_PERMITIDAS.has(`${clean} ext`) ||
        GEOCERCAS_PERMITIDAS.has(clean.replace(/ ext\.?$/, "")) ||
        GEOCERCAS_PERMITIDAS.has(raw)
    );
}

function isLogisticaGeofence(name) {
    return GEOFENCES_L.has(name.trim());
}
function isAgenciaGeofence(name) {
    return GEOFENCES_A.has(name.trim());
}
function isTallerGeofence(name) {
    return GEOFENCES_T.has(name.trim());
}

function getAutoFlag(row) {
    if (!hasSignal(row)) return "";

    if (row.zones.some((z) => isSucursalGeofence(z.name))) return "S";
    if (row.zones.some((z) => isLogisticaGeofence(z.name))) return "L";
    if (row.zones.some((z) => isAgenciaGeofence(z.name))) return "A";
    if (row.zones.some((z) => isTallerGeofence(z.name))) return "T";

    return (row.speed ?? 0) < 10 ? "I" : "";
}

function getTipo(row) {
    return (row.tipoManual ?? getAutoFlag(row)).toUpperCase();
}

function getTipoTooltip(row) {
    const tipo = getTipo(row);

    const nombres = (fn) =>
        row.zones.filter((z) => fn(z.name)).map((z) => z.name);

    switch (tipo) {
        case "S":
            return `Sucursal: ${nombres(isSucursalGeofence).join(", ")}`;
        case "L":
            return `Logística: ${nombres(isLogisticaGeofence).join(", ")}`;
        case "A":
            return `Agencia: ${nombres(isAgenciaGeofence).join(", ")}`;
        case "T":
            return `Taller: ${nombres(isTallerGeofence).join(", ")}`;
        case "I":
            return "Inactivo fuera de geocerca (vel < 10 km/h)";
        default:
            return "Tipo editable (S / L / A / T / I)";
    }
}

/* ======================= FETCH ======================= */

async function fetchData(unitNames) {
    const unitsResp = await fetch(`${API}/wialon/units`);
    const unitsJson = await unitsResp.json();
    const units = unitsJson.units || [];

    const geofResp = await fetch(
        `${API}/wialon/resources/18891825/geofences`
    );
    const geofJson = await geofResp.json();
    const allGeofences = geofJson.geofences || [];

    const allowedZoneIds = allGeofences
        .filter((g) => {
            const name = String(g.name || "");
            return (
                isSucursalGeofence(name) ||
                isLogisticaGeofence(name) ||
                isAgenciaGeofence(name) ||
                isTallerGeofence(name)
            );
        })
        .map((g) => Number(g.id));

    const chunks = chunkArray(unitNames, CHUNK_SIZE);
    const mergedCross = {};

    for (const chunk of chunks) {
        const url =
            `${API}/wialon/units/in-geofences/local` +
            `?resource_id=18891825` +
            `&names=${encodeURIComponent(chunk.join(","))}` +
            `&zone_ids=${encodeURIComponent(allowedZoneIds.join(","))}`;

        const resp = await fetch(url);
        const json = await resp.json();
        Object.assign(mergedCross, json.result || {});
    }

    return { units, allGeofences, cross: mergedCross };
}

/* ======================= UI ======================= */

function Badge({ label }) {
    return (
        <span className="inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
            {label}
        </span>
    );
}

/* ======================= COMPONENT ======================= */

export default function MonitoreoPro() {
    const [unitInput, setUnitInput] = useState("");
    const [searches, setSearches] = useState([]);
    const [activeSearchId, setActiveSearchId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tipoFilter, setTipoFilter] = useState("");

    // ✅ FIX: estas funciones deben vivir dentro del componente para usar searches/setSearches
    const updateRowField = (searchId, rowId, field, val) => {
        setSearches((prev) =>
            prev.map((s) =>
                s.id !== searchId
                    ? s
                    : {
                        ...s,
                        rows: s.rows.map((r) =>
                            r.id === rowId
                                ? {
                                    ...r,
                                    [field]: val,
                                    horaTipo:
                                        field === "tipoManual"
                                            ? formatHoraActual()
                                            : r.horaTipo,
                                }
                                : r
                        ),
                    }
            )
        );
    };

    const handleCopyTipo = async () => {
        if (!searches.length) return;

        const txt = searches[0].rows
            .map((r) => getTipo(r))
            .join("\n");

        try {
            await navigator.clipboard.writeText(txt);
            alert("Columna 'Tipo' copiada. Pega directo en Excel ✅");
        } catch (e) {
            console.error("No se pudo copiar:", e);
            alert("No se pudo copiar automáticamente");
        }
    };

    const handleDownloadExcel = () => {
        if (!searches.length) return;

        const rows = searches[0].rows.map((r) => ({
            Unidad: r.name,
            Ruta: r.ruta,
            Segmento: r.segmento,
            Tipo: getTipo(r),
            Hora: r.horaTipo ?? "",
            "Última posición": fmtDT(r.t),
            Latitud: r.lat ?? "",
            Longitud: r.lon ?? "",
            Geocercas: r.zones.map((z) => z.name).join(", "),
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Monitoreo");

        XLSX.writeFile(wb, `Monitoreo_${Date.now()}.xlsx`);
    };

    const updateRow = (rowId, field, val) => {
        setSearches((prev) =>
            prev.map((s) =>
                s.id !== activeSearchId
                    ? s
                    : {
                        ...s,
                        rows: s.rows.map((r) =>
                            r.id === rowId ? { ...r, [field]: val } : r
                        ),
                    }
            )
        );
    };

    const handleSearch = async () => {
        const unitNames = unitInput
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);

        if (!unitNames.length) return;

        setLoading(true);

        const { units, allGeofences, cross } = await fetchData(unitNames);

        const unitByName = new Map();
        units.forEach((u) => unitByName.set(u.name.toLowerCase(), u));

        const geofenceById = new Map();
        allGeofences.forEach((g) =>
            geofenceById.set(g.id, { id: g.id, name: g.name })
        );

        const zonesByUnitId = {};
        Object.values(cross).forEach((byUnit) => {
            Object.entries(byUnit || {}).forEach(([uid, val]) => {
                zonesByUnitId[+uid] = (zonesByUnitId[+uid] || []).concat(val || []);
            });
        });

        const nowSec = Date.now() / 1000;

        const rows = unitNames.map((name, idx) => {
            const found = unitByName.get(name.toLowerCase());
            if (!found)
                return { id: 100000 + idx, name, zones: [], ruta: "", segmento: "", tipoManual: "", horaTipo: "" };

            const isStale = !found.t || nowSec - found.t > MAX_AGE_SEC;

            const zones = (zonesByUnitId[found.id] || [])
                .map((id) => geofenceById.get(id))
                .filter(Boolean);

            const base = {
                id: found.id,
                name: found.name,
                lat: found.lat,
                lon: found.lon,
                t: found.t,
                speed: found.speed,
                zones: isStale ? [] : zones,
                ruta: "",
                segmento: "",
            };

            const tipo = isStale ? "" : getTipo(base);

            return {
                ...base,
                // ✅ IMPORTANT: siempre string para que el input sea controlado y editable
                tipoManual: tipo || "",
                horaTipo: tipo ? formatHoraActual() : "",
            };
        });

        const search = {
            id: Date.now(),
            label: `Búsqueda ${searches.length + 1}`,
            createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
            rows,
        };

        setSearches((p) => [...p, search]);
        setActiveSearchId(search.id);
        setLoading(false);
    };

    /* ======================= RENDER ======================= */
    const baseSearch =
        searches.find((s) => s.id === activeSearchId) ?? searches[0];

    const visibleRows = baseSearch
        ? baseSearch.rows.filter((r) => {
            if (!tipoFilter) return true;
            // ✅ FIX: filtra por getTipo (respeta tipoManual), no por getAutoFlag
            return getTipo(r) === tipoFilter;
        })
        : [];

    return (
        <div className="min-h-screen bg-white text-black p-6 mt-10">
            {/* ================= HEADER ================= */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">
                    Unidades y Geocercas
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Comparación horizontal • Operación diaria • Estilo Excel
                </p>
            </div>

            {/* ================= INPUT ================= */}
            <label className="block text-sm font-semibold text-gray-800 mb-1">
                Ingresa las unidades
            </label>

            <textarea
                className="w-full rounded-lg border border-gray-300 bg-white p-4 mb-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value)}
                placeholder={`Ejemplo:\nITM 38578\nITM 38867`}
            />

            {/* ================= GRUPOS ================= */}
            {PREDEFINED_GROUPS.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-600 font-semibold">Grupos rápidos:</span>

                    {PREDEFINED_GROUPS.map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setUnitInput(g.units.join("\n"))}
                            className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-gray-800 hover:bg-gray-100 hover:border-gray-400 transition"
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
            )}

            {/* ================= BOTONES ================= */}
            <div className="mb-6 flex gap-3">
                <button
                    onClick={handleSearch}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? "Consultando..." : "Buscar unidades"}
                </button>

                {searches.length > 0 && (
                    <>
                        <button
                            onClick={handleCopyTipo}
                            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                        >
                            Copiar columna Tipo (Excel)
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                        >
                            Descargar Excel
                        </button>
                    </>
                )}
            </div>

            {/* ================= FILTRO POR TIPO ================= */}
            {searches.length > 0 && (
                <div className="mb-4 flex gap-2 flex-wrap items-center text-xs">
                    <span className="text-gray-600 font-semibold">Ver:</span>

                    {[
                        { k: "", label: "Todos" },
                        { k: "S", label: "Sucursal" },
                        { k: "L", label: "Local" },
                        { k: "A", label: "Agencia" },
                        { k: "T", label: "Taller" },
                        { k: "I", label: "Incidencia" },
                    ].map((t) => (
                        <button
                            key={t.k}
                            onClick={() => setTipoFilter(t.k)}
                            className={`rounded-full px-4 py-1.5 border transition ${tipoFilter === t.k
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}

                    <span className="ml-2 text-gray-500">
                        {visibleRows.length} unidades
                    </span>
                </div>
            )}

            {/* ================= TABLA ================= */}
            {searches.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                    <table className="min-w-max border-collapse text-sm">
                        {/* ============ HEADER ============ */}
                        <thead className="sticky top-0 z-40 bg-gray-100">
                            <tr>
                                {/* FIJAS */}
                                <th className="sticky left-0 z-50 bg-gray-100 px-4 py-3 w-[170px] border-r font-semibold">
                                    Unidad
                                </th>
                                <th className="sticky left-[170px] z-50 bg-gray-100 px-4 py-3 w-[200px] border-r font-semibold">
                                    Ruta
                                </th>
                                <th className="sticky left-[370px] z-50 bg-gray-100 px-4 py-3 w-[230px] border-r font-semibold">
                                    Segmento
                                </th>

                                {/* POR BÚSQUEDA */}
                                {searches.map((s, idx) => (
                                    <th
                                        key={s.id}
                                        colSpan={idx === 0 ? 5 : 2}
                                        className="px-4 py-3 text-center border-r"
                                    >
                                        <div className="font-semibold">{s.label}</div>
                                        <div className="text-[11px] text-gray-600">
                                            {s.createdAt}
                                        </div>
                                    </th>
                                ))}
                            </tr>

                            <tr>
                                <th className="sticky left-0 z-50 bg-gray-100 border-r" />
                                <th className="sticky left-[170px] z-50 bg-gray-100 border-r" />
                                <th className="sticky left-[370px] z-50 bg-gray-100 border-r" />

                                {searches.map((_, idx) => (
                                    <React.Fragment key={idx}>
                                        <th className="px-3 py-2">Tipo</th>
                                        <th className="px-3 py-2">Hora</th>

                                        {idx === 0 && (
                                            <>
                                                <th className="px-3 py-2">Última posición</th>
                                                <th className="px-3 py-2">Lat / Lon</th>
                                                <th className="px-3 py-2 border-r">Geocercas</th>
                                            </>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>

                        {/* ============ BODY ============ */}
                        <tbody>
                            {visibleRows.map((row) => (
                                <tr key={row.id} className="border-t hover:bg-gray-50">
                                    {/* UNIDAD */}
                                    <td className="sticky left-0 z-30 bg-white px-4 py-3 font-bold border-r shadow-[6px_0_12px_-8px_rgba(0,0,0,0.25)]">
                                        {row.name}
                                    </td>

                                    {/* RUTA */}
                                    <td className="sticky left-[170px] z-30 bg-white px-4 py-3 border-r shadow-[6px_0_12px_-8px_rgba(0,0,0,0.25)]">
                                        <input
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black text-sm"
                                            value={row.ruta}
                                            onChange={(e) =>
                                                updateRow(row.id, "ruta", e.target.value)
                                            }
                                        />
                                    </td>

                                    {/* SEGMENTO */}
                                    <td className="sticky left-[370px] z-30 bg-white px-4 py-3 border-r shadow-[6px_0_12px_-8px_rgba(0,0,0,0.25)]">
                                        <input
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black text-sm"
                                            value={row.segmento}
                                            onChange={(e) =>
                                                updateRowField(
                                                    baseSearch.id,
                                                    row.id,
                                                    "segmento",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    {/* POR BÚSQUEDA */}
                                    {searches.map((s, searchIdx) => {
                                        const baseUnit = row;

                                        const u =
                                            s.rows.find((r) => r.id === baseUnit.id) ??
                                            {
                                                ...baseUnit,
                                                tipoManual: "",
                                                horaTipo: "",
                                                zones: [],
                                                lat: undefined,
                                                lon: undefined,
                                                t: undefined,
                                            };

                                        return (
                                            <React.Fragment key={`${s.id}-${u.id}`}>
                                                <td className="px-3 py-2">
                                                    <input
                                                        className="w-12 rounded-lg border border-gray-300 bg-white text-black text-center font-semibold"
                                                        // ✅ editable: valor controlado desde estado real
                                                        value={u.tipoManual}
                                                        title={getTipoTooltip(u)}
                                                        onChange={(e) =>
                                                            updateRowField(
                                                                s.id,
                                                                u.id,
                                                                "tipoManual",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </td>

                                                <td className="px-3 py-2 text-sm">
                                                    {u.horaTipo ?? "—"}
                                                </td>

                                                {searchIdx === 0 && (
                                                    <>
                                                        <td className="px-3 py-2">{fmtDT(u.t)}</td>
                                                        <td className="px-3 py-2">
                                                            {hasSignal(u) && u.lat != null && u.lon != null
                                                                ? `${u.lat.toFixed(6)}, ${u.lon.toFixed(6)}`
                                                                : "—"}
                                                        </td>
                                                        <td className="px-3 py-2 border-r">
                                                            {u.zones.length ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {u.zones.map((z) => (
                                                                        <Badge key={z.id} label={z.name} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500">
                                                                    Sin geocercas
                                                                </span>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
