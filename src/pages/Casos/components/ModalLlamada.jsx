import { useState, useRef, useEffect } from "react";

export default function ModalLlamadaCabina({ abierto, evento, onColgar }) {
  const [agentCode, setAgentCode] = useState("");
  const [llamando, setLlamando] = useState(false);
  const [enLlamada, setEnLlamada] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [mute, setMute] = useState(false);

  const [telefonoUnidad, setTelefonoUnidad] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // ===============================
  // ✅ EXTRAER TELÉFONO DESDE API
  // ===============================
  useEffect(() => {
    if (!abierto || !evento?.unidad) return;
    const fetchTelefono = async () => {
      try {
        const token = localStorage.getItem("auth_token");

        const resp = await fetch(
          `https://apipx.onrender.com/unidad/test-unidad-telefono?name=${encodeURIComponent(
            evento.unidad,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await resp.json();
        console.log(data);
        if (data?.phone) {
          // ✅ limpiar teléfono: quitar +52
          const limpio = data.phone.replace("+52", "");

          // ✅ agregar prefijo 9
          setTelefonoUnidad("9" + limpio);
        }
      } catch (err) {
        console.error("Error obteniendo teléfono:", err);
        alert("Error consultando teléfono de unidad");
      }
    };

    fetchTelefono();
  }, [abierto, evento]);

  // ===============================
  // TIMER DE LLAMADA
  // ===============================
  useEffect(() => {
    if (!enLlamada) return;

    timerRef.current = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [enLlamada]);

  // Corte automático a los 60s
  useEffect(() => {
    if (segundos >= 60) colgar();
  }, [segundos]);

  // Reset al cerrar modal
  useEffect(() => {
    if (!abierto) {
      clearInterval(timerRef.current);
      setEnLlamada(false);
      setSegundos(0);
      setMute(false);
      setLlamando(false);
      setAgentCode("");
      setTelefonoUnidad(null);
    }
  }, [abierto]);

  // ===============================
  // ✅ LLAMAR CABINA
  // ===============================
  const llamarCabina = async () => {
    if (!agentCode) {
      alert("Ingresa el código del agente");
      return;
    }

    if (!telefonoUnidad) {
      alert("No hay teléfono asignado a esta unidad");
      return;
    }

    setLlamando(true);
    abortRef.current = new AbortController();

    try {
      await fetch("https://agentpatsec-a9l7.onrender.com/llamar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          numero: telefonoUnidad,
          agentCode,
        }),
      });

      setEnLlamada(true);
      setSegundos(0);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error al llamar cabina", error);
        alert("Error al iniciar la llamada");
      }
    } finally {
      setLlamando(false);
    }
  };

  const colgar = () => {
    clearInterval(timerRef.current);
    abortRef.current?.abort();
    setEnLlamada(false);
    setSegundos(0);
    onColgar?.();
  };

  const formatTime = (s) => `00:${s.toString().padStart(2, "0")}`;

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      {!abierto || !evento ? null : (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-6">
            {/* HEADER */}
            <div className="text-center">
              <div className="text-4xl mb-2">📞</div>
              <h2 className="text-lg font-bold text-gray-800">
                Llamada desde conmutador
              </h2>
              <p className="text-xs text-gray-500">Unidad: {evento.unidad}</p>
            </div>

            {/* ✅ TELÉFONO */}
            <div className="mt-3 text-xs text-center text-gray-600">
              {telefonoUnidad ? (
                <>
                  📱 Teléfono detectado: <b>{telefonoUnidad}</b>
                </>
              ) : (
                "Buscando teléfono de unidad..."
              )}
            </div>

            {/* TIMER */}
            {enLlamada && (
              <div className="mt-4 text-center text-xl font-mono text-green-600">
                {formatTime(segundos)} / 01:00
              </div>
            )}

            {/* INPUT AGENTE */}
            {!enLlamada && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-gray-600">
                  Código de agente
                </label>
                <input
                  type="text"
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  placeholder="FEF2EA"
                />
              </div>
            )}

            {/* BOTONES */}
            <div className="mt-6 space-y-3">
              {!enLlamada && (
                <button
                  onClick={llamarCabina}
                  disabled={llamando || !telefonoUnidad}
                  className="w-full py-2 rounded bg-green-600 text-white font-semibold"
                >
                  {llamando ? "Llamando…" : "Llamar"}
                </button>
              )}

              <button
                onClick={colgar}
                className="w-full py-2 rounded bg-red-600 text-white font-semibold"
              >
                Colgar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
