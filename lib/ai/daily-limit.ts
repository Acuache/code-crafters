// Personalizaciones por usuario en una ventana móvil de 24 h (no día calendario: así no depende
// de la zona horaria del usuario). Cada fila de `ai_personalizations` es un intento que llegó a
// llamar al modelo, haya salido bien o no.
export const DAILY_PERSONALIZATION_LIMIT = 5;

export function remainingPersonalizations(usedInLast24h: number): number {
  const remaining = DAILY_PERSONALIZATION_LIMIT - usedInLast24h;
  return Math.max(0, remaining);
}
