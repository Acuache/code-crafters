import Image from "next/image";
import { FireIcon } from "@phosphor-icons/react/ssr";

import { getStreakImageSource } from "@/components/gamification/streak-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { MS_PER_DAY, type StreakSummary } from "@/lib/gamification/streak";
import { cn } from "@/lib/utils";

type StreakCardProps = {
  streak: StreakSummary;
  activityDates: string[];
  // En la zona del usuario: el reloj del servidor puede estar en otro día.
  today: string;
};

const WEEK_LENGTH = 7;
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("es-ES", { weekday: "narrow", timeZone: "UTC" });
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function lastWeek(today: string): Date[] {
  const todayMs = Date.parse(`${today}T00:00:00Z`);

  return Array.from({ length: WEEK_LENGTH }, (_, index) => {
    const daysAgo = WEEK_LENGTH - 1 - index;
    return new Date(todayMs - daysAgo * MS_PER_DAY);
  });
}

function formatDays(count: number): string {
  return count === 1 ? "1 día" : `${count} días`;
}

export function StreakCard({ streak, activityDates, today }: StreakCardProps) {
  const activeDates = new Set(activityDates);

  return (
    <Card size="sm" className="border border-border/70 shadow-sm ring-0">
      <CardContent className="gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <FireIcon
              weight="fill"
              className={cn(
                "size-8 shrink-0",
                streak.current > 0 ? "text-primary-bright" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {formatDays(streak.current)}
              </span>
              <span className="text-xs text-muted-foreground">
                Racha actual · récord {formatDays(streak.best)}
              </span>
            </div>
          </div>
          <Image
            src={getStreakImageSource(streak.current)}
            alt=""
            width={48}
            height={60}
            className="streak-mascot-motion shrink-0"
          />
        </div>

        <ol className="flex justify-between gap-1.5" aria-label="Tu actividad de la última semana">
          {lastWeek(today).map((date) => {
            const isoDate = date.toISOString().slice(0, 10);
            const hadActivity = activeDates.has(isoDate);
            const activityLabel = hadActivity ? "con avance" : "sin avance";

            return (
              <li
                key={isoDate}
                className="flex flex-col items-center gap-1"
                aria-label={`${FULL_DATE_FORMAT.format(date)}: ${activityLabel}`}
                data-testid="streak-day"
              >
                <span
                  className={cn(
                    "size-3 rounded-full",
                    hadActivity ? "bg-primary-bright" : "bg-muted",
                  )}
                />
                <span className="text-[0.65rem] text-muted-foreground uppercase" aria-hidden="true">
                  {WEEKDAY_FORMAT.format(date)}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
