import type { StepOrigin } from "@/lib/paths/types";

export type GroupableStep = {
  origin: StepOrigin;
  programSlug: string | null;
  programName: string | null;
};

export type StepGroup<Step extends GroupableStep> = {
  key: string;
  title: string;
  isInterestGroup: boolean;
  steps: Step[];
};

const INTERESTS_GROUP_KEY = "intereses";
const NO_PROGRAM_GROUP_KEY = "sin-programa";

// Los pasos llegan en orden de estudio y el motor numera las etapas de corrido por programa, así
// que agrupar en orden de aparición no reordena el plan. Los de interés cierran la ruta.
export function groupStepsByProgram<Step extends GroupableStep>(steps: Step[]): StepGroup<Step>[] {
  const programGroups = new Map<string, StepGroup<Step>>();
  const interestGroup: StepGroup<Step> = {
    key: INTERESTS_GROUP_KEY,
    title: "Por tus intereses",
    isInterestGroup: true,
    steps: [],
  };

  for (const step of steps) {
    if (step.origin === "interes") {
      interestGroup.steps.push(step);
      continue;
    }

    const groupKey = step.programSlug ?? NO_PROGRAM_GROUP_KEY;
    let group = programGroups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        title: step.programName ?? "Otros cursos",
        isInterestGroup: false,
        steps: [],
      };
      programGroups.set(groupKey, group);
    }
    group.steps.push(step);
  }

  const groups = [...programGroups.values()];
  if (interestGroup.steps.length > 0) {
    groups.push(interestGroup);
  }

  return groups;
}
