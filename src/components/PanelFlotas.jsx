import { useMemo, useState } from "react";

export default function PanelFlotas({
    units = [],
    showUnits,
    setShowUnits,
    showGeocercas,
    setShowGeocercas,
    showLineales,
    setShowLineales,
    autoCenter,
    setAutoCenter,
}) {
    const [search, setSearch] = useState("");

    const filteredUnits = useMemo(() => {
        return units.filter(u =>
            (u.name ?? u.label ?? u.id)
                .toString()
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [units, search]);

    return (
        <div className="absolute top-4 left-4 z-50 w-80 rounded-2xl bg-[#1f2933]/95 text-white shadow-xl backdrop-blur">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 font-semibold">
                    🚚 Unidades
                    <span className="text-xs opacity-70">{units.length} total</span>
                </div>
                <button className="opacity-60 hover:opacity-100">✕</button>
            </div>

            {/* SEARCH */}
            <div className="p-3">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar unidad..."
                    className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none"
                />
            </div>

            {/* TOGGLE ALL */}
            <div className="px-4 py-2 flex items-center justify-between text-sm">
                <span>Mostrar / Ocultar todas</span>
                <button
                    onClick={() => setShowUnits(v => !v)}
                    className={`px-3 py-1 rounded-full text-xs ${showUnits ? "bg-green-500" : "bg-red-500"
                        }`}
                >
                    {showUnits ? "Mostrar" : "Ocultar"}
                </button>
            </div>

            {/* LIST */}
            <div className="max-h-[45vh] overflow-y-auto px-2">
                {filteredUnits.map((u) => (
                    <div
                        key={u.id}
                        className="mx-2 my-2 rounded-xl bg-white/5 p-3 text-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div className="font-medium truncate">
                                {u.name ?? u.label ?? `Unidad ${u.id}`}
                            </div>

                            <input
                                type="checkbox"
                                checked={showUnits}
                                onChange={() => setShowUnits(v => !v)}
                                className="scale-125"
                            />
                        </div>

                        <div className="mt-2 flex gap-2 text-xs opacity-80">
                            <span>🚀 {u.speed ?? 0} km/h</span>
                            <span>⏱ {u.lastUpdate ?? "--"}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* FOOTER */}
            <div className="border-t border-white/10 p-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                    <span>Autocentrado</span>
                    <input
                        type="checkbox"
                        checked={autoCenter}
                        onChange={() => setAutoCenter(v => !v)}
                        className="scale-125"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span>Geocercas</span>
                    <input
                        type="checkbox"
                        checked={showGeocercas}
                        onChange={() => setShowGeocercas(v => !v)}
                        className="scale-125"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span>Lineales</span>
                    <input
                        type="checkbox"
                        checked={showLineales}
                        onChange={() => setShowLineales(v => !v)}
                        className="scale-125"
                    />
                </div>
            </div>
        </div>
    );
}
