import { useCallback, useRef, useState } from "react";
import { parseWialonMessage } from "./wialonParser";

/* =========================
   Engine
========================= */

export function useCasosEngine() {
  const [casos, setCasos] = useState([]);
  const [criticos, setCriticos] = useState([]);

  const historial = useRef(new Map());
  const WINDOW = 10 * 60 * 1000; // 10 minutos

  const pushAlerta = useCallback(
    ({ mensaje, unidad, tipo, ts }) => {
      const parsed = parseWialonMessage(mensaje);
      const key = parsed.unidad || unidad || "SIN_UNIDAD";

      const hist = historial.current.get(key) || [];
      const nuevoHist = [...hist, { tipo: parsed.tipo, ts }];
      historial.current.set(key, nuevoHist.slice(-20));

      /* ===== REPETICIONES ===== */
      const recientes = nuevoHist.filter((h) => ts - h.ts <= WINDOW);
      const rep = recientes.filter((r) => r.tipo === parsed.tipo).length;

      /* ===== COMBINACIONES ===== */
      const tiposUnicos = Array.from(
        new Set(recientes.map((r) => r.tipo))
      );

      const combinacion =
        tiposUnicos.length >= 2 ? tiposUnicos.join(" + ") : undefined;

      const esCritico = Boolean(combinacion || rep >= 2);

      const caso = {
        id: crypto.randomUUID(),
        unitName: parsed.unidad,
        alertType: parsed.tipo,
        message: parsed.descripcion,
        ts,
        repetitions: rep,
        combinacion,
        critical: esCritico,
      };

      setCasos((prev) => [caso, ...prev].slice(0, 100));

      if (esCritico) {
        setCriticos((prev) => [caso, ...prev].slice(0, 50));
      }
    },
    []
  );

  return {
    casos,
    criticos,
    pushAlerta,
  };
}
