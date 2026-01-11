export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (res.status === 401) {
    // 🔥 Sesión inválida (JWT o Wialon)
    localStorage.removeItem("auth_token");
    localStorage.removeItem("wialon_units");

    window.location.href = "/login?reason=session_expired";
    return;
  }

  return res;
}
