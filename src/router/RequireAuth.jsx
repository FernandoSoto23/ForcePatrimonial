import { Navigate } from "react-router-dom";

function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

export default function RequireAuth({ children }) {
  const token = localStorage.getItem("auth_token");

  if (!token || !isTokenValid(token)) {
    // 🔥 Limpieza defensiva
    localStorage.removeItem("auth_token");
    localStorage.removeItem("wialon_units");

    return <Navigate to="/login" replace />;
  }

  return children;
}
