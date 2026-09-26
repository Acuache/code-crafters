const MAX_NEXT_PATH_LENGTH = 200;
// Un origen cualquiera: solo sirve para ver si `next` intenta salir de él.
const PLACEHOLDER_ORIGIN = "http://devpathlles.invalid";

// A dónde volver después del login (spec 15). Solo rutas internas: un `next` que apunte a otro
// sitio convertiría el login en un redirect abierto.
export function parseNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_NEXT_PATH_LENGTH) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  // El parser del navegador ignora tabs y saltos de línea y trata "\" como "/": si después de eso
  // la URL cambia de origen, era un intento de salir del sitio.
  const url = new URL(value, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
