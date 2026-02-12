import { useEffect } from "react";
import { io } from "socket.io-client";
import { useCasosEngine } from "./useCasosEngine";
import { parseUnidad, parseTipo } from "./parseAlerta";

const API_URL = "https://apipx.onrender.com";
const SOCKET_URL = "https://apipx.onrender.com";

export function useCasosRealtime() {
  const engine = useCasosEngine();

  /* ===== CARGA INICIAL ===== */
  useEffect(() => {
    fetch(`${API_URL}/alertas/activas`)
      .then((r) => r.json())
      .then((data) => {
        data.forEach((a) => {
          engine.pushAlerta({
            mensaje: a.mensaje,
            unidad: a.unidad || parseUnidad(a.mensaje),
            tipo: a.tipo || parseTipo(a.mensaje),
            ts: a.fecha_hora_incidente
              ? Date.parse(a.fecha_hora_incidente)
              : Date.now(),
          });
        });
      });
  }, []);

  /* ===== WEBSOCKET ===== */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("nueva_alerta", (a) => {
      const mensaje = a.message ?? a.mensaje ?? "";

      let ts = null;

      if (a.fecha_hora_incidente) {
        ts = Date.parse(a.fecha_hora_incidente);
      }

      if (!ts) {
        const raw = extraerFechaHora(mensaje);
        if (raw) {
          const [fecha, hora] = raw.split(" ");
          ts = buildTs(fecha, hora);
        }
      }

      if (!ts) ts = Date.now();

      engine.pushAlerta({
        mensaje,
        unidad: a.unitName || parseUnidad(mensaje),
        tipo: a.alertType || parseTipo(mensaje),
        ts,
      });
    });


    return () => socket.disconnect();
  }, []);

  return engine;
}
