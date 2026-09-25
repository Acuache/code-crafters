import Image from "next/image";
import { FireIcon } from "@phosphor-icons/react/ssr";

import type { StreakSummary } from "@/lib/gamification/streak";
import { cn } from "@/lib/utils";

type StreakIndicatorProps = {
  streak: StreakSummary;
};

function formatDays(count: number): string {
  return count === 1 ? "1 día" : `${count} días`;
}

function describeStreak(streak: StreakSummary): string {
  if (streak.current === 0) {
    return "Empieza tu racha hoy";
  }

  if (!streak.isActiveToday) {
    return "Avanza hoy para no perder tu racha";
  }

  return "Ya avanzaste hoy";
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const hasStreak = streak.current > 0;
  // Sin racha no hay nada que perder.
  const needsReminder = hasStreak && !streak.isActiveToday;

  return (
    <div className="flex items-center gap-3">
      <FireIcon
        weight="fill"
        className={cn(
          "size-8 shrink-0",
          hasStreak ? "text-primary-bright" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col">
        <span className="font-heading text-xl font-semibold tabular-nums">
          <span className="sr-only">Racha: </span>
          {formatDays(streak.current)}
        </span>
        <span className="text-xs text-muted-foreground">{describeStreak(streak)}</span>
      </div>
      {needsReminder ? (
        <Image src="/streak/reminder.webp" alt="" width={39} height={48} className="shrink-0" />
      ) : null}
    </div>
  );
}
