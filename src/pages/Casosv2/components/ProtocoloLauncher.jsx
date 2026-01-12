import React, { useEffect, useMemo, useState } from "react";

/**
 * Helper para clases
 */
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ProtocolLauncher({
  label,
  icon = "📄",
  variant = "outline", // "outline" | "solid"
  title,
  subtitle,
  modalIcon,
  children,
  onOpen,
}) {
  const [open, setOpen] = useState(false);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const buttonClass = useMemo(() => {
    const base =
      "w-full rounded-2xl border px-4 py-3 text-left transition " +
      "shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

    if (variant === "solid") {
      return cn(base, "border-indigo-200 bg-indigo-50 hover:bg-indigo-100");
    }

    return cn(base, "border-slate-200 bg-white hover:bg-slate-50");
  }, [variant]);

  return (
    <>
      {/* BOTÓN */}
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          onOpen && onOpen();
          setOpen(true);
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            aria-hidden
          >
            <span className="text-lg leading-none">{icon}</span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {label}
            </div>
            <div className="truncate text-xs text-slate-500">
              {subtitle || "Abrir protocolo"}
            </div>
          </div>

          <div className="ml-auto hidden text-xs text-slate-400 sm:block">
            Abrir →
          </div>
        </div>
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-[9999] mt-11">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onMouseDown={() => setOpen(false)}
          />

          {/* Contenedor */}
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
            <div
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl w-[min(980px,92vw)] max-h-[85vh]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    {modalIcon || <span aria-hidden>{icon}</span>}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm sm:text-base font-semibold text-slate-900">
                      {title}
                    </div>
                    {subtitle && (
                      <div className="truncate text-[11px] sm:text-xs text-slate-500">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    ✕
                  </span>
                  Cerrar
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[calc(85vh-72px)] px-4 py-4 sm:px-5 sm:py-4">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
