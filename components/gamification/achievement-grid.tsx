import {
  CompassIcon,
  FireIcon,
  FlagCheckeredIcon,
  FootprintsIcon,
  GraduationCapIcon,
  LockSimpleIcon,
  MedalIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/gamification/achievements";
import { cn } from "@/lib/utils";

// Los iconos de /ssr no usan contexto: también sirven en el modal (cliente).
export const ACHIEVEMENT_ICONS: Record<AchievementId, Icon> = {
  "first-step": FootprintsIcon,
  "first-course": GraduationCapIcon,
  "path-complete": FlagCheckeredIcon,
  explorer: CompassIcon,
  consistency: FireIcon,
  marathoner: MedalIcon,
};

const MEDAL_SIZES = {
  md: {
    box: "h-[5.25rem] w-16",
    disc: "size-16 inset-ring-4",
    icon: "size-8",
    ribbon: "top-10 h-10 w-4",
    ribbonLeft: "left-3.5",
    ribbonRight: "right-3.5",
    lock: "top-10 right-0 size-6",
    lockIcon: "size-3.5",
  },
  sm: {
    box: "h-12 w-10",
    disc: "size-10 inset-ring-2",
    icon: "size-5",
    ribbon: "top-6 h-6 w-2.5",
    ribbonLeft: "left-2",
    ribbonRight: "right-2",
    lock: "top-6 right-0 size-4",
    lockIcon: "size-2.5",
  },
};

// Cinta de premio: cuelga del disco, abierta hacia afuera y con la punta en V.
const RIBBON_CLASS = "absolute origin-top [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]";

type AchievementMedalProps = {
  achievementId: AchievementId;
  isEarned: boolean;
  size?: keyof typeof MEDAL_SIZES;
};

export function AchievementMedal({ achievementId, isEarned, size = "md" }: AchievementMedalProps) {
  const AchievementIcon = ACHIEVEMENT_ICONS[achievementId];
  const sizes = MEDAL_SIZES[size];

  return (
    <span className={cn("relative inline-block shrink-0", sizes.box)} aria-hidden="true">
      {/* Solo el dibujo: con el texto al 60 % no llegaba a 4.5:1. */}
      <span className={cn("absolute inset-0", !isEarned && "opacity-60")}>
        <span
          className={cn(
            RIBBON_CLASS,
            sizes.ribbon,
            sizes.ribbonLeft,
            "rotate-[18deg]",
            isEarned ? "bg-primary-end" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            RIBBON_CLASS,
            sizes.ribbon,
            sizes.ribbonRight,
            "-rotate-[18deg]",
            isEarned ? "bg-primary-bright" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "absolute top-0 left-0 flex items-center justify-center rounded-full",
            sizes.disc,
            isEarned
              ? "bg-linear-[135deg] from-primary to-primary-end text-primary-foreground shadow-brand-glow inset-ring-primary-foreground/25"
              : "bg-muted text-muted-foreground inset-ring-muted-foreground/25",
          )}
        >
          <AchievementIcon weight={isEarned ? "fill" : "regular"} className={sizes.icon} />
        </span>
      </span>
      {isEarned ? null : (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-border",
            sizes.lock,
          )}
        >
          <LockSimpleIcon weight="fill" className={sizes.lockIcon} />
        </span>
      )}
    </span>
  );
}

type AchievementGridProps = {
  earned: AchievementId[];
};

export function AchievementGrid({ earned }: AchievementGridProps) {
  const earnedIds = new Set(earned);

  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {ACHIEVEMENTS.map((achievement) => {
        const isEarned = earnedIds.has(achievement.id);

        return (
          <li key={achievement.id}>
            <Card size="sm" className={cn("h-full", isEarned && "ring-primary-bright/40")}>
              <CardContent className="flex flex-col items-center gap-2 text-center">
                <AchievementMedal achievementId={achievement.id} isEarned={isEarned} />
                <span className="font-heading font-semibold text-balance">
                  {achievement.name}
                  <span className="sr-only">{isEarned ? " (ganada)" : " (bloqueada)"}</span>
                </span>
                <span className="text-sm text-pretty text-muted-foreground">
                  {isEarned ? achievement.description : `Cómo ganarla: ${achievement.howToEarn}`}
                </span>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
