const COOKIE_NAME = "codigo_agente";
const HORAS = 8;

export function setCodigoAgente(codigo) {
  const expires = new Date();
  expires.setTime(expires.getTime() + HORAS * 60 * 60 * 1000);

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    codigo
  )}; expires=${expires.toUTCString()}; path=/`;
}

export function getCodigoAgente() {
  const cookies = document.cookie.split("; ");

  for (const c of cookies) {
    const [key, value] = c.split("=");
    if (key === COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function clearCodigoAgente() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}
