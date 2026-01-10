import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoNotifications } from "react-icons/io5";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSSE } from "../../providers/SSEProvider";

export default function CasesSidebar({
  anchorRef = null,
  open = false,
  setOpen = () => {},
}) {
  const { casos } = useSSE();
  const navigate = useNavigate();

  const [position, setPosition] = useState({ x: 0, y: 0 });

  /* UBICACIÓN DEL DROPDOWN (pegado a la campana) */
  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      x: rect.left - 330 + rect.width,
      y: rect.bottom + 10,
    });
  }, [anchorRef, open]);

  const safeDecode = (t) => {
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  };

  /* UBICAR UNIDAD */
  const locate = () => {
    try {
      setOpen(false);
      navigate("/mapa");
    } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="
            fixed z-[999999]
            w-[340px] max-h-[450px]
            rounded-xl
            bg-[#1F2228]/95 backdrop-blur-xl
            border border-white/10
            shadow-[0_5px_25px_rgba(0,0,0,0.6)]
            overflow-hidden
          "
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#262A31] border-b border-white/10">
            <span className="text-white font-semibold">Notificaciones</span>
            <button onClick={() => setOpen(false)}>
              <X className="text-gray-300 hover:text-white" />
            </button>
          </div>

          {/* LISTA */}
          <div className="p-3 space-y-3 max-h-[390px] overflow-y-auto">
            {casos.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-[#2A2E35] rounded-lg border border-white/10 flex items-start gap-3"
              >
                <IoNotifications className="text-yellow-400 text-xl" />
                <div className="flex-1 text-white text-sm">
                  {safeDecode(c.message)}
                  <div className="text-xs text-gray-400">
                    {new Date(c.timestamp).toLocaleString("es-MX")}
                  </div>
                </div>
                <button
                  onClick={() => locate()}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md"
                >
                  Ubicar
                </button>
              </div>
            ))}

            {casos.length === 0 && (
              <p className="text-gray-400 text-center py-10 text-sm">
                No hay notificaciones
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
