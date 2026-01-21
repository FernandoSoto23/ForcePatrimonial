export default function SidePanel({
    open,
    title,
    onClose,
    children,
    theme = "light",
}) {
    if (!open) return null;

    return (
        <div
            className={`
        fixed
        top-[80px]              /* MÁS ABAJO del header */
        left-[88px]
        z-40
        w-[300px]
        max-h-[70vh]            /* 🔥 CLAVE: NO ocupa todo */
        ${theme === "dark"
                    ? "bg-black/75 text-white"
                    : "bg-white/95 text-gray-900"
                }
        backdrop-blur
        border border-black/10
        shadow-lg
        rounded-lg
        flex flex-col
      `}
        >
            {/* HEADER COMPACTO */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
                <h2 className="text-sm font-semibold">{title}</h2>
                <button
                    onClick={onClose}
                    className="text-lg opacity-60 hover:opacity-100"
                >
                    ✕
                </button>
            </div>

            {/* CONTENT SCROLLABLE */}
            <div className="overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
