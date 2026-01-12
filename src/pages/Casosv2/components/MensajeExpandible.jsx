import { useState, memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const MensajeExpandable = memo(function MensajeExpandable({ mensaje }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-gray-900 transition"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Ocultar mensaje completo" : "Ver mensaje completo"}
      </button>

      {open && (
        <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-3 text-xs whitespace-pre-wrap text-gray-800 shadow-sm">
          {mensaje}
        </div>
      )}
    </div>
  );
});

export default MensajeExpandable;
