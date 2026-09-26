// Hay slugs con tildes (p. ej. "Ingeniería-de-prompts"). Decodificar un valor ya decodificado no lo
// cambia, porque los slugs no llevan "%", así que sirve llegue como llegue el parámetro.
export function decodeSlugParam(slugParam: string): string {
  try {
    return decodeURIComponent(slugParam);
  } catch {
    return slugParam;
  }
}
