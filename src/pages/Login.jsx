import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login() {
  const fullText = "Wialon Security Dashboard 2.0";
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);
  const [hover, setHover] = useState(false);

  /* ================= TEXTO ANIMADO ================= */
  useEffect(() => {
    const speed = del ? 40 : 80;
    const t = setTimeout(() => {
      if (!del && i < fullText.length) {
        setText(fullText.slice(0, i + 1));
        setI(i + 1);
      } else if (del && i > 0) {
        setText(fullText.slice(0, i - 1));
        setI(i - 1);
      } else if (i === fullText.length) {
        setTimeout(() => setDel(true), 1500);
      } else if (i === 0 && del) {
        setDel(false);
      }
    }, speed);

    return () => clearTimeout(t);
  }, [i, del]);

  function handleLogin() {
    // ✅ En vez de borrar TODO el localStorage, borra solo lo tuyo
    localStorage.removeItem("wialon_sid");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session");

    window.location.href = `${API_URL}/auth/wialon/login`;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        background: "#020617",
        overflow: "hidden",
      }}
    >
      {/* ================= IZQUIERDA ================= */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px, 5vw, 80px)",
          zIndex: 2,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* LOGO */}
          <img
            src="/logo.png"
            alt="Force Patrimonial"
            style={{
              width: 110,
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.7))",
            }}
          />

          {/* ===== PANEL GLASS iOS ===== */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              padding: 40,
              borderRadius: 26,
              color: "#fff",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
              backdropFilter: hover ? "blur(30px)" : "blur(22px)",
              WebkitBackdropFilter: hover ? "blur(30px)" : "blur(22px)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow:
                "0 40px 90px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.25)",
              overflow: "hidden",
            }}
          >
            {/* ===== REFLEJO ANIMADO ===== */}
            <div
              style={{
                position: "absolute",
                inset: "-60%",
                background:
                  "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                transform: "rotate(12deg)",
                animation: "glassMove 8s linear infinite",
                pointerEvents: "none",
                opacity: hover ? 0.9 : 0.6,
              }}
            />

            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
              Force Patrimonial
            </h1>

            <p style={{ color: "#cbd5f5", marginBottom: 32 }}>
              Accede al panel con tu cuenta de Wialon
            </p>

            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "14px 0",
                background: "#000",
                color: "#fff",
                borderRadius: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              }}
            >
              Entrar
            </button>

            <p
              style={{
                marginTop: 24,
                fontFamily: "monospace",
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              {text}
              <span>|</span>
            </p>

            <p style={{ marginTop: 36, fontSize: 12, color: "#64748b" }}>
              © 2026 Paquetexpress
            </p>
          </div>
        </div>
      </div>

      {/* ================= DERECHA ================= */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px, 4vw, 80px)",
          transition: "filter 0.6s ease",
          filter: hover ? "blur(8px) brightness(0.85)" : "none",
        }}
      >
        <img
          src="/login.jpg"
          alt="Centro de Monitoreo"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transition: "transform 0.6s ease",
            transform: hover ? "scale(1.03)" : "scale(1)",
            filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.9))",
          }}
        />
      </div>

      {/* ===== KEYFRAMES ===== */}
      <style>{`
        @keyframes glassMove {
          0% { transform: translateX(-40%) rotate(12deg); }
          100% { transform: translateX(40%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}
