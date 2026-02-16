import { useState, useRef, useEffect } from "react";
import { PhoneCall, PhoneOff, Mic, MicOff, X, Clock } from "lucide-react";
import { getCodigoAgente } from "../../../utils/codigoAgente";

export default function ModalLlamadaCabina({ abierto, evento, onColgar }) {
  const [llamando, setLlamando] = useState(false);
  const [enLlamada, setEnLlamada] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [telefonoUnidad, setTelefonoUnidad] = useState(null);
  const [muteado, setMuteado] = useState(false);
  const [callSid, setCallSid] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // ===============================
  // OBTENER TELÉFONO
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
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const data = await resp.json();
        if (data?.phone) {
          const limpio = data.phone.replace("+52", "");
          setTelefonoUnidad("9" + limpio);
        }
      } catch (e) {
        console.error("Error obteniendo teléfono", e);
      }
    };

    fetchTelefono();
  }, [abierto, evento]);

  // ===============================
  // TIMER
  // ===============================
  useEffect(() => {
    if (!enLlamada) return;

    timerRef.current = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [enLlamada]);

  useEffect(() => {
    if (segundos >= 60) colgar();
  }, [segundos]);

  useEffect(() => {
    if (!abierto) reset();
  }, [abierto]);

  const reset = () => {
    clearInterval(timerRef.current);
    setEnLlamada(false);
    setSegundos(0);
    setLlamando(false);
    setMuteado(false);
    setTelefonoUnidad(null);
  };

  // ===============================
  // LLAMAR
  // ===============================
  const llamarCabina = async () => {
    const agentCode = getCodigoAgente();
    if (!agentCode || !telefonoUnidad) return;

    setLlamando(true);
    abortRef.current = new AbortController();

    try {
      await fetch("https://agentpatsec-a9l7.onrender.com/llamar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({ numero: telefonoUnidad, agentCode }),
      });

      setEnLlamada(true);
      setSegundos(0);
    } catch (e) {
      console.error("Error al llamar", e);
    } finally {
      setLlamando(false);
    }
  };

  const colgar = async () => {
    clearInterval(timerRef.current);

    try {
      const agentCode = getCodigoAgente();

      await fetch("https://agentpatsec-a9l7.onrender.com/colgar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentCode }),
      });
    } catch (e) {
      console.error("Error colgando llamada", e);
    }

    reset();
    onColgar?.();
  };

  const formatTime = (s) => `00:${s.toString().padStart(2, "0")}`;

  if (!abierto || !evento) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-gray-800">
            Llamada desde conmutador
          </h2>
          <p className="text-sm text-gray-500">
            Unidad: <b>{evento.unidad}</b>
          </p>
        </div>

        {/* TELÉFONO */}
        <div className="text-center text-sm text-gray-600">
          {telefonoUnidad
            ? `Teléfono encontrado!`
            : "Buscando teléfono de unidad…"}
        </div>

        {/* TIMER */}
        {enLlamada && (
          <div className="flex justify-center items-center gap-2 text-green-600 font-mono text-lg">
            <Clock className="w-4 h-4" />
            {formatTime(segundos)} / 01:00
          </div>
        )}

        {/* BOTONERA CUADROS */}
        <div className="flex justify-center gap-4 pt-4">
          {/* LLAMAR */}
          {!enLlamada && (
            <BotonCuadro
              icon={PhoneCall}
              label="Llamar"
              color="green"
              disabled={llamando || !telefonoUnidad}
              onClick={llamarCabina}
            />
          )}

          {/* MUTE */}
          {enLlamada && (
            <BotonCuadro
              icon={muteado ? MicOff : Mic}
              label={muteado ? "Muteado" : "Mutear"}
              active={muteado}
              onClick={() => setMuteado(!muteado)}
            />
          )}

          {/* COLGAR / CERRAR */}
          {enLlamada ? (
            <BotonCuadro
              icon={PhoneOff}
              label="Colgar"
              color="red"
              onClick={colgar}
            />
          ) : (
            <BotonCuadro icon={X} label="Cerrar" onClick={colgar} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================= */
/* BOTÓN CUADRO REUTILIZABLE */
/* ================================================= */
function BotonCuadro({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  color = "gray",
}) {
  const colors = {
    green: "text-green-600 hover:bg-green-100",
    red: "text-red-600 hover:bg-red-100",
    gray: "text-gray-700 hover:bg-gray-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-20 h-20 rounded-xl
        bg-gray-100
        flex flex-col items-center justify-center
        transition
        ${colors[color]}
        ${active ? "ring-2 ring-green-500 bg-green-50" : ""}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
