import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const token = localStorage.getItem("auth_token");

  // Si YA está logueado → al dashboard
  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
