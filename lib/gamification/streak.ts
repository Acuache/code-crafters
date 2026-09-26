export type StreakSummary = {
  // Termina hoy o ayer: un avance de ayer todavía se puede continuar hoy.
  current: number;
  best: number;
  isActiveToday: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MS_PER_DAY = 86_400_000;

// En UTC a propósito: la fecha ya está en la zona del usuario y así el horario de verano no altera
// la duración de un día.
function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

// `days` puede venir en cualquier orden y con repetidos; `today` ya está en la zona del usuario.
// Ignora fechas inválidas o futuras.
export function computeStreak(days: string[], today: string): StreakSummary {
  const todayNumber = toDayNumber(today);
  const uniqueDayNumbers = new Set<number>();

  for (const day of days) {
    if (!ISO_DATE.test(day)) {
      continue;
    }

    const dayNumber = toDayNumber(day);
    if (dayNumber <= todayNumber) {
      uniqueDayNumbers.add(dayNumber);
    }
  }

  const sortedDayNumbers = [...uniqueDayNumbers].sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previousDayNumber: number | null = null;

  for (const dayNumber of sortedDayNumbers) {
    const continuesRun = previousDayNumber !== null && dayNumber === previousDayNumber + 1;
    run = continuesRun ? run + 1 : 1;
    best = Math.max(best, run);
    previousDayNumber = dayNumber;
  }

  const lastDayNumber = sortedDayNumbers.at(-1);
  const isActiveToday = lastDayNumber === todayNumber;
  const isActiveYesterday = lastDayNumber === todayNumber - 1;
  const current = isActiveToday || isActiveYesterday ? run : 0;

  return { current, best, isActiveToday };
}

// 'en-CA' formatea como YYYY-MM-DD. Una zona inválida cae a UTC, igual que en Postgres.
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(now);
  }
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
