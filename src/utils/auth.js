import { jwtDecode } from "jwt-decode";

export function getAuthUser() {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    // opcional: validar expiración
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("auth_token");
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}