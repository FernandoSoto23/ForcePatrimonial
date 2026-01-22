import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login() {
  const fullText = "Wialon Security Dashboard 2.0";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        setIndex(index + 1);
      }
    }, 70);

    return () => clearTimeout(timer);
  }, [index]);

  function handleLogin() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("wialon_units");
    window.location.href = `${API_URL}/auth/wialon/login`;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Fondo */}
      <img
        src="/login.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 text-center animate-fade-in">
        {/* Logo / Título */}
        <h1 className="text-2xl font-semibold tracking-wide mb-2">
          Force Patrimonial
        </h1>

        <p className="text-sm text-blue-200 mb-6 min-h-[20px]">
          {displayedText}
          <span className="animate-pulse">|</span>
        </p>

        {/* Botón */}
        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-blue-500 to-indigo-600
                     hover:from-blue-600 hover:to-indigo-700
                     transition-all duration-300 shadow-lg hover:shadow-blue-500/40"
        >
          Iniciar sesión con Wialon
        </button>

        {/* Footer */}
        <p className="mt-6 text-xs text-white/60">
          Seguridad Patrimonial · Acceso controlado
        </p>
      </div>
    </div>
  );
}
