// Los iconos viven en components/gamification/achievement-grid.tsx: lib no importa React.

export type AchievementId =
  "first-step" | "first-course" | "path-complete" | "explorer" | "consistency" | "marathoner";

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  howToEarn: string;
};

export type AchievementStats = {
  hasAnyActivity: boolean;
  completedCourses: number;
  // Al menos un paso vigente y todos los vigentes 'done'.
  completedPaths: number;
  createdPaths: number;
  bestStreak: number;
  completedHours: number;
};

const EXPLORER_MIN_PATHS = 3;
const CONSISTENCY_MIN_STREAK_DAYS = 7;
const MARATHONER_MIN_HOURS = 50;

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-step",
    name: "Primer paso",
    description: "Empezaste tu primer curso",
    howToEarn: "Marca un paso como En curso o Hecho",
  },
  {
    id: "first-course",
    name: "Primer curso",
    description: "Completaste tu primer curso",
    howToEarn: "Marca un curso como Hecho o aprueba su quiz",
  },
  {
    id: "path-complete",
    name: "Ruta completa",
    description: "Terminaste todos los cursos de una ruta",
    howToEarn: "Completa todos los cursos de una de tus rutas",
  },
  {
    id: "explorer",
    name: "Explorador",
    description: `Creaste ${EXPLORER_MIN_PATHS} rutas de aprendizaje`,
    howToEarn: `Crea ${EXPLORER_MIN_PATHS} rutas de aprendizaje`,
  },
  {
    id: "consistency",
    name: "Constancia",
    description: `Avanzaste ${CONSISTENCY_MIN_STREAK_DAYS} días seguidos`,
    howToEarn: `Avanza en tus rutas ${CONSISTENCY_MIN_STREAK_DAYS} días seguidos`,
  },
  {
    id: "marathoner",
    name: "Maratonista",
    description: `Completaste ${MARATHONER_MIN_HOURS} horas de cursos`,
    howToEarn: `Completa ${MARATHONER_MIN_HOURS} horas de cursos`,
  },
];

const EARNING_RULES: Record<AchievementId, (stats: AchievementStats) => boolean> = {
  "first-step": (stats) => stats.hasAnyActivity,
  "first-course": (stats) => stats.completedCourses >= 1,
  "path-complete": (stats) => stats.completedPaths >= 1,
  explorer: (stats) => stats.createdPaths >= EXPLORER_MIN_PATHS,
  consistency: (stats) => stats.bestStreak >= CONSISTENCY_MIN_STREAK_DAYS,
  marathoner: (stats) => stats.completedHours >= MARATHONER_MIN_HOURS,
};

export function earnedAchievementIds(stats: AchievementStats): AchievementId[] {
  const earned = ACHIEVEMENTS.filter((achievement) => EARNING_RULES[achievement.id](stats));
  return earned.map((achievement) => achievement.id);
}
