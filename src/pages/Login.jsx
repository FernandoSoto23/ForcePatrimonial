import { useState, useEffect } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export default function Login() {
  const fullText = "Wialon Security Dashboard 2.0";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const typingSpeed = deleting ? 40 : 80;
    const timer = setTimeout(() => {
      if (!deleting && index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        setIndex(index + 1);
      } else if (deleting && index > 0) {
        setDisplayedText(fullText.slice(0, index - 1));
        setIndex(index - 1);
      } else if (index === fullText.length) {
        setTimeout(() => setDeleting(true), 2000);
      } else if (index === 0 && deleting) {
        setDeleting(false);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [index, deleting]);

  function handleLogin() {
    // 🔥 LIMPIEZA TOTAL
    localStorage.removeItem("auth_token");
    localStorage.removeItem("wialon_units");
    console.log(`${API_URL}/auth/wialon/login`)

    window.location.href = `${API_URL}/auth/wialon/login`;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden select-none">
      {/* Fondo */}
      <img
        src="/login.jpg"
        alt="Fondo"
        className="absolute inset-0 w-full h-full object-cover brightness-75"
      />

      {/* Botón */}
      <button
        onClick={handleLogin}
        className="z-10 px-10 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg shadow-lg transition-all"
      >
        Force Patrimonial
      </button>

      {/* Texto animado */}
      <p className="z-10 mt-6 text-sm text-blue-200 font-light">
        {displayedText}
        <span>|</span>
      </p>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
    </div>
  );
}
