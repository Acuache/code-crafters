// Ventana móvil de 24 h y no día calendario, para no depender de la zona horaria. Cuenta cada
// llamada al modelo, haya salido bien o no.
export const DAILY_PERSONALIZATION_LIMIT = 5;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

export function remainingPersonalizations(usedInLast24h: number): number {
  const remaining = DAILY_PERSONALIZATION_LIMIT - usedInLast24h;
  return Math.max(0, remaining);
}

// Un uso se libera cuando el más viejo de la ventana cumple 24 h.
export function nextPersonalizationAt(oldestUseInWindow: Date): Date {
  return new Date(oldestUseInWindow.getTime() + DAY_IN_MS);
}

// "4 h 37 min", "25 min": relativo, porque el servidor no sabe la zona horaria del navegador.
export function describeTimeUntil(retryAt: Date, now: Date): string {
  const totalMinutes = Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / MINUTE_IN_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}
