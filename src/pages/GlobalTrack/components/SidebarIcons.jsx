"use client";

import { FaTruck, FaDrawPolygon, FaMap } from "react-icons/fa";
import { MdOutlineReplay10 } from "react-icons/md";

export default function SidebarIcons({ active, onSelect }) {
    const btn = (key, icon, title) => (
        <button
            onClick={() => onSelect(key)}
            title={title}
            className={[
                "h-11 w-11 rounded-xl flex items-center justify-center transition",
                "ring-1 ring-white/10",
                active === key
                    ? "bg-blue-600 text-white"
                    : "bg-black/70 text-white/70 hover:bg-black/90",
            ].join(" ")}
        >
            {icon}
        </button>
    );

    return (
        <div className="fixed left-3 top-[72px] z-40 flex flex-col gap-2">
            {btn("units", <FaTruck size={18} />, "Unidades")}
            {btn("geos", <FaDrawPolygon size={18} />, "Geocercas")}
            {btn("history", <MdOutlineReplay10 size={18} />, "Historial")}
            {btn("mapStyle", <FaMap size={18} />, "Modo de mapa")}
        </div>
    );
}
