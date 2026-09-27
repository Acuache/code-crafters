import Image from "next/image";
import { FireIcon } from "@phosphor-icons/react/ssr";

import { Card, CardContent } from "@/components/ui/card";
import type { StreakSummary } from "@/lib/gamification/streak";
import { cn } from "@/lib/utils";

const STREAK_CELEBRATION_COUNT = 4;

type StreakIndicatorProps = {
  streak: StreakSummary;
  variant?: "compact" | "dashboard";
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

function getStreakImageSource(streakDays: number): string {
  if (streakDays === 0) {
    return "/streak/reminder.webp";
  }

  const celebrationNumber = ((streakDays - 1) % STREAK_CELEBRATION_COUNT) + 1;
  return `/streak/celebration-${celebrationNumber}.webp`;
}

function getStreakFlameClass(streakDays: number): string {
  if (streakDays === 0) {
    return "text-muted-foreground";
  }

  if (streakDays < 3) {
    return "text-primary/65";
  }

  if (streakDays < 7) {
    return "text-primary/75";
  }

  if (streakDays < 14) {
    return "text-primary-bright";
  }

  return "text-primary-bright streak-flame-glow";
}

export function StreakIndicator({ streak, variant = "compact" }: StreakIndicatorProps) {
  const hasStreak = streak.current > 0;
  // Sin racha no hay nada que perder.
  const needsReminder = hasStreak && !streak.isActiveToday;
  const isDashboard = variant === "dashboard";
  const daysLabel = (
    <span
      className={cn(
        "font-heading font-semibold tabular-nums",
        isDashboard ? "text-2xl" : "text-xl",
      )}
    >
      <span className="sr-only">Racha: </span>
      {formatDays(streak.current)}
    </span>
  );

  const status = (
    <div className="flex min-w-0 flex-col">
      {isDashboard ? (
        <span className="text-xs font-medium text-muted-foreground">Tu racha</span>
      ) : null}
      {isDashboard ? (
        <div className="flex items-center gap-2">
          {daysLabel}
          <FireIcon
            weight="fill"
            className={cn(
              "size-6 shrink-0 transition-colors duration-500",
              getStreakFlameClass(streak.current),
            )}
            aria-hidden="true"
          />
        </div>
      ) : (
        daysLabel
      )}
      <span className="text-xs text-muted-foreground">{describeStreak(streak)}</span>
    </div>
  );

  if (isDashboard) {
    return (
      <Card size="sm" className="w-full sm:w-auto sm:min-w-64">
        <CardContent className="flex-row items-center gap-3 py-1">
          <Image
            src={getStreakImageSource(streak.current)}
            alt=""
            width={56}
            height={70}
            className="streak-mascot-motion shrink-0"
          />
          {status}
        </CardContent>
      </Card>
    );
  }

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
      {status}
      {needsReminder ? (
        <Image src="/streak/reminder.webp" alt="" width={39} height={48} className="shrink-0" />
      ) : null}
    </div>
  );
}
