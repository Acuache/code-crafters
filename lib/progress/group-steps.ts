import type { CourseDifficulty } from "@/lib/paths/types";

export type GroupableStep = {
  stage: number;
  courseDifficulty: CourseDifficulty;
};

export type StepGroup<Step extends GroupableStep> = {
  key: string;
  title: string;
  // 1, 2 o 3: el número del tramo dentro de esta ruta.
  tierNumber: number;
  steps: Step[];
};

const TIERS = [
  { key: "primeros-pasos", title: "Primeros pasos" },
  { key: "intermedio", title: "Intermedio" },
  { key: "avanzado", title: "Avanzado" },
] as const;

const DIFFICULTY_RANK: Record<CourseDifficulty, number> = {
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
};

function hardestRankByStage(steps: GroupableStep[]): Map<number, number> {
  const hardestRank = new Map<number, number>();
  for (const step of steps) {
    const rank = DIFFICULTY_RANK[step.courseDifficulty];
    hardestRank.set(step.stage, Math.max(hardestRank.get(step.stage) ?? 0, rank));
  }
  return hardestRank;
}

// Tramo = dificultad más alta alcanzada hasta cada etapa (spec 17): nunca retrocede ni parte etapas.
export function groupStepsByTier<Step extends GroupableStep>(steps: Step[]): StepGroup<Step>[] {
  const hardestRank = hardestRankByStage(steps);
  const groups: StepGroup<Step>[] = [];
  let reachedRank = -1;

  for (const step of steps) {
    const stageRank = hardestRank.get(step.stage) ?? 0;
    const currentGroup = groups.at(-1);

    if (!currentGroup || stageRank > reachedRank) {
      reachedRank = Math.max(reachedRank, stageRank);
      const tier = TIERS[reachedRank];
      groups.push({
        key: tier.key,
        title: tier.title,
        tierNumber: groups.length + 1,
        steps: [step],
      });
      continue;
    }

    currentGroup.steps.push(step);
  }

  return groups;
}
