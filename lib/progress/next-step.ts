import type { PathStepStatus } from "./path-progress";

// Forma mínima que necesita el cálculo, igual que ProgressStep: el dashboard la arma desde su
// propia query sin depender de la forma que usa la vista de una ruta.
export type NextStepCandidate = {
  status: PathStepStatus;
  stage: number;
  position: number;
  courseTitle: string;
};

export type NextStep = {
  courseTitle: string;
  status: "pending" | "in_progress";
};

/**
 * El próximo curso de una ruta: el primer `in_progress` en orden de estudio y, si no hay, el
 * primer `pending`. Un `in_progress` gana sobre un `pending` anterior porque es lo que el usuario
 * ya está cursando. Devuelve `null` cuando todo está hecho o descartado.
 */
export function findNextStep(steps: NextStepCandidate[]): NextStep | null {
  const stepsInStudyOrder = [...steps].sort(compareByStudyOrder);

  const firstInProgress = stepsInStudyOrder.find((step) => step.status === "in_progress");
  if (firstInProgress) {
    return { courseTitle: firstInProgress.courseTitle, status: "in_progress" };
  }

  const firstPending = stepsInStudyOrder.find((step) => step.status === "pending");
  if (firstPending) {
    return { courseTitle: firstPending.courseTitle, status: "pending" };
  }

  return null;
}

function compareByStudyOrder(a: NextStepCandidate, b: NextStepCandidate): number {
  if (a.stage !== b.stage) {
    return a.stage - b.stage;
  }

  return a.position - b.position;
}
