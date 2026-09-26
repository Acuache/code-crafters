// Ventana móvil de 24 h y no día calendario, para no depender de la zona horaria. Cuenta cada
// llamada al modelo, haya salido bien o no.
export const DAILY_PERSONALIZATION_LIMIT = 5;

export function remainingPersonalizations(usedInLast24h: number): number {
  const remaining = DAILY_PERSONALIZATION_LIMIT - usedInLast24h;
  return Math.max(0, remaining);
}
