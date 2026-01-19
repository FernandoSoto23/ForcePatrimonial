import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://apipx.onrender.com";

export function useLiveAlerts(limit = 20) {
  const [alerts, setAlerts] = useState([]);
  const bufferRef = useRef([]);

  useEffect(() => {
    const flush = () => {
      if (bufferRef.current.length === 0) return;

      setAlerts((prev) => {
        const next = [...bufferRef.current, ...prev];
        bufferRef.current = [];
        return next.slice(0, limit);
      });
    };

    const interval = setInterval(flush, 300);
    return () => clearInterval(interval);
  }, [limit]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("nueva_alerta", (a) => {
      bufferRef.current.push({
        id: a.id ?? a.alertaId,
        unidad: a.unidad ?? a.unitName,
        tipo: a.tipo ?? a.alertType,
        mensaje: a.mensaje ?? a.message,
        ts: Date.now(),
      });
    });

    return () => socket.disconnect();
  }, []);

  return alerts;
}
