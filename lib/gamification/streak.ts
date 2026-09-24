const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function deriveStreak(activityDates: string[], today: string): { current: number; best: number } {
  const dates = [...new Set(activityDates)]
    .filter((date) => DATE_KEY.test(date) && dayNumber(date) <= dayNumber(today))
    .sort();
  let run = 0;
  let best = 0;
  let previous: number | null = null;

  for (const date of dates) {
    const day = dayNumber(date);
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return { current: dates.at(-1) === today ? run : 0, best };
}
