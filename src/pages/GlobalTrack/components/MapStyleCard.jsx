import { FaMap, FaSatelliteDish, FaMoon } from "react-icons/fa";

export default function MapStyleCard({ value, onChange, onClose }) {
    return (
        <div className="absolute left-16 top-24 z-50 bg-white rounded-xl shadow-xl w-56 border">
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-semibold text-sm">Modo de mapa</span>
                <button onClick={onClose}>✕</button>
            </div>

            <button
                onClick={() => onChange("normal")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 ${value === "normal" ? "bg-gray-100 font-semibold" : ""
                    }`}
            >
                <FaMap /> Normal
            </button>

            <button
                onClick={() => onChange("satellite")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 ${value === "satellite" ? "bg-gray-100 font-semibold" : ""
                    }`}
            >
                <FaSatelliteDish /> Satélite
            </button>

            <button
                onClick={() => onChange("dark")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 ${value === "dark" ? "bg-gray-100 font-semibold" : ""
                    }`}
            >
                <FaMoon /> Oscuro
            </button>
        </div>
    );
}
