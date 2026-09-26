"use client";

import { AchievementMedal } from "@/components/gamification/achievement-grid";
import { StreakIndicator } from "@/components/gamification/streak-indicator";
import { XpBar } from "@/components/gamification/xp-bar";
import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { courseXp, levelFromXp } from "@/lib/gamification/xp";
import { EXAMPLE_COURSES } from "@/lib/landing/example-path";

import { useJourneyStation } from "../journey";

// El XP de ejemplo sale de las reglas reales del spec 14, no de un número escrito a mano.
const firstCourse = EXAMPLE_COURSES[0];
const EXAMPLE_XP = courseXp(firstCourse.hours);
const EXAMPLE_LEVEL = levelFromXp(EXAMPLE_XP);
const EXAMPLE_STREAK = { current: 5, best: 5, isActiveToday: true };

function requireFirstCourseAchievement() {
  const achievement = ACHIEVEMENTS.find((candidate) => candidate.id === "first-course");
  if (!achievement) {
    throw new Error("Falta la insignia first-course en ACHIEVEMENTS");
  }

  return achievement;
}

const firstCourseAchievement = requireFirstCourseAchievement();

export function ProgressMockup() {
  const { isRevealed } = useJourneyStation();
  // Antes de llegar, la barra espera en 0 para llenarse cuando llega el astronauta.
  const currentXp = isRevealed ? EXAMPLE_LEVEL.xpIntoLevel : 0;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        {/* La barra se llena más lento que su transición por defecto, y después del viaje. */}
        <div className="**:data-[slot=progress-indicator]:delay-(--arrival-delay) **:data-[slot=progress-indicator]:duration-1000">
          <XpBar
            level={EXAMPLE_LEVEL.level}
            currentXp={currentXp}
            nextLevelXp={EXAMPLE_LEVEL.xpForNextLevel}
          />
        </div>
        <p className="font-medium">
          +{EXAMPLE_XP} XP · «{firstCourse.title}»
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AchievementMedal achievementId="first-course" isEarned size="sm" />
            <div className="flex flex-col">
              <span className="font-medium">{firstCourseAchievement.name}</span>
              <span className="text-xs text-muted-foreground">
                {firstCourseAchievement.description}
              </span>
            </div>
          </div>
          <StreakIndicator streak={EXAMPLE_STREAK} />
        </div>
      </CardContent>
    </Card>
  );
}
