import type { PathStepStatus } from "@/lib/progress/path-progress";

import { earnedAchievementIds, type AchievementId, type AchievementStats } from "./achievements";
import { computeStreak, type StreakSummary } from "./streak";
import { courseXp, levelFromXp, type LevelProgress } from "./xp";

export type GamificationStep = {
  id: string;
  courseId: number;
  status: PathStepStatus;
  hours: number;
};

export type GamificationPath = {
  id: string;
  steps: GamificationStep[];
};

export type GamificationInput = {
  paths: GamificationPath[];
  activityDays: string[];
  // En la zona del usuario.
  today: string;
};

export type GamificationSummary = {
  totalXp: number;
  level: LevelProgress;
  streak: StreakSummary;
  stats: AchievementStats;
  earned: AchievementId[];
  completedPathIds: string[];
};

export type StepChange = {
  pathId: string;
  stepId: string;
  status: "in_progress" | "done";
  recordedActivityDay: boolean;
};

export type CelebrationEvents = {
  // null si esta acción no lo pasó a "Hecho"; gainedXp 0: ya contaba por otra ruta.
  completedCourse: { gainedXp: number } | null;
  completedPathId: string | null;
  levelUp: number | null;
  newAchievements: AchievementId[];
};

export type MainCelebration = "path-complete" | "level-up" | "achievement";

const NOTHING_TO_CELEBRATE: CelebrationEvents = {
  completedCourse: null,
  completedPathId: null,
  levelUp: null,
  newAchievements: [],
};

// Evita residuos como 15.100000000000001.
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function isPathComplete(path: GamificationPath): boolean {
  const activeSteps = path.steps.filter((step) => step.status !== "discarded");
  if (activeSteps.length === 0) {
    return false;
  }

  return activeSteps.every((step) => step.status === "done");
}

// El mismo curso hecho en dos rutas cuenta una vez.
function completedCourseHours(paths: GamificationPath[]): Map<number, number> {
  const hoursByCourse = new Map<number, number>();

  for (const path of paths) {
    for (const step of path.steps) {
      if (step.status === "done") {
        hoursByCourse.set(step.courseId, step.hours);
      }
    }
  }

  return hoursByCourse;
}

export function summarizeGamification(input: GamificationInput): GamificationSummary {
  const hoursByCourse = completedCourseHours(input.paths);

  let totalXp = 0;
  let completedHours = 0;
  for (const hours of hoursByCourse.values()) {
    totalXp += courseXp(hours);
    completedHours += hours;
  }

  const completedPathIds = input.paths.filter(isPathComplete).map((path) => path.id);
  const streak = computeStreak(input.activityDays, input.today);

  const stats: AchievementStats = {
    hasAnyActivity: input.activityDays.length > 0,
    completedCourses: hoursByCourse.size,
    completedPaths: completedPathIds.length,
    createdPaths: input.paths.length,
    bestStreak: streak.best,
    completedHours: roundToOneDecimal(completedHours),
  };

  return {
    totalXp,
    level: levelFromXp(totalXp),
    streak,
    stats,
    earned: earnedAchievementIds(stats),
    completedPathIds,
  };
}

function findStep(input: GamificationInput, change: StepChange): GamificationStep | null {
  const path = input.paths.find((candidate) => candidate.id === change.pathId);
  return path?.steps.find((step) => step.id === change.stepId) ?? null;
}

// Lo mismo que hicieron el update y el RPC en la base.
function applyStepChange(before: GamificationInput, change: StepChange): GamificationInput {
  const paths = before.paths.map((path) => {
    if (path.id !== change.pathId) {
      return path;
    }

    const steps = path.steps.map((step) =>
      step.id === change.stepId ? { ...step, status: change.status } : step,
    );
    return { ...path, steps };
  });

  const activityDays = change.recordedActivityDay
    ? [...before.activityDays, before.today]
    : before.activityDays;

  return { ...before, paths, activityDays };
}

export function celebrateStepChange(
  before: GamificationInput,
  change: StepChange,
): CelebrationEvents {
  const previousStep = findStep(before, change);
  if (!previousStep) {
    return NOTHING_TO_CELEBRATE;
  }

  const summaryBefore = summarizeGamification(before);
  const summaryAfter = summarizeGamification(applyStepChange(before, change));

  const justCompletedStep = change.status === "done" && previousStep.status !== "done";
  const completedCourse = justCompletedStep
    ? { gainedXp: summaryAfter.totalXp - summaryBefore.totalXp }
    : null;

  const pathWasComplete = summaryBefore.completedPathIds.includes(change.pathId);
  const pathIsComplete = summaryAfter.completedPathIds.includes(change.pathId);
  const completedPathId = !pathWasComplete && pathIsComplete ? change.pathId : null;

  const levelBefore = summaryBefore.level.level;
  const levelAfter = summaryAfter.level.level;
  const levelUp = levelAfter > levelBefore ? levelAfter : null;

  const newAchievements = summaryAfter.earned.filter(
    (achievementId) => !summaryBefore.earned.includes(achievementId),
  );

  return { completedCourse, completedPathId, levelUp, newAchievements };
}

// Prioridad: ruta > nivel > insignia; null = sin modal.
export function mainCelebration(events: CelebrationEvents): MainCelebration | null {
  if (events.completedPathId !== null) {
    return "path-complete";
  }

  if (events.levelUp !== null) {
    return "level-up";
  }

  if (events.newAchievements.length > 0) {
    return "achievement";
  }

  return null;
}
