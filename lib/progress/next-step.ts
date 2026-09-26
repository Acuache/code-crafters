import type { PathStepStatus } from "./path-progress";

export type NextStepCandidate = {
  status: PathStepStatus;
  stage: number;
  position: number;
};

// El próximo paso de una ruta: el primer `in_progress` en orden de estudio y, si no hay, el primer
// `pending`. Un `in_progress` gana aunque haya un `pending` antes, porque es lo que el usuario ya
// está cursando. Devuelve el mismo paso que recibió, o null si todo está hecho o descartado.
export function findNextStep<Step extends NextStepCandidate>(steps: Step[]): Step | null {
  const stepsInStudyOrder = [...steps].sort(compareByStudyOrder);

  const firstInProgress = stepsInStudyOrder.find((step) => step.status === "in_progress");
  if (firstInProgress) {
    return firstInProgress;
  }

  return stepsInStudyOrder.find((step) => step.status === "pending") ?? null;
}

function compareByStudyOrder(a: NextStepCandidate, b: NextStepCandidate): number {
  if (a.stage !== b.stage) {
    return a.stage - b.stage;
  }

  return a.position - b.position;
}
