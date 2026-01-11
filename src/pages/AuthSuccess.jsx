import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem("auth_token", token);

    window.history.replaceState({}, document.title, "/");

    navigate("/", { replace: true });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <p>Autenticando…</p>
    </div>
  );
}
