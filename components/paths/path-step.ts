import type { StepGroup } from "@/lib/progress/group-steps";
import type { StepOrigin } from "@/lib/paths/types";
import type { CourseQuiz } from "@/lib/quizzes/schema";
import {
  summarizePathProgress,
  type PathProgress,
  type PathStepStatus,
} from "@/lib/progress/path-progress";

// Una fila de path_steps con su curso y su programa, como la arma app/(app)/paths/[id]/page.tsx.
export type PathStepView = {
  id: string;
  stage: number;
  position: number;
  origin: StepOrigin;
  reason: string;
  status: PathStepStatus;
  discardReason: string | null;
  courseTitle: string;
  courseHours: number;
  courseUrl: string;
  courseImageUrl: string | null;
  // El quiz activo del curso (spec 13), cargado con la página; null si el curso no tiene.
  quiz: CourseQuiz | null;
  programSlug: string | null;
  programName: string | null;
};

export type PathStepGroup = StepGroup<PathStepView>;

// La ruta se ve como mapa (por defecto) o como lista.
export type PathView = "mapa" | "lista";

export function isPathView(value: unknown): value is PathView {
  return value === "mapa" || value === "lista";
}

// La vista vive en la URL para que recargar o compartir el link la conserve. replaceState y no
// router.replace: la página es dinámica y router.replace volvería a pedir el Server Component solo
// para cambiar de pestaña. Next sincroniza replaceState con su router.
export function writeViewToUrl(view: PathView) {
  const url = new URL(window.location.href);
  if (view === "lista") {
    url.searchParams.set("vista", "lista");
  } else {
    url.searchParams.delete("vista");
  }

  window.history.replaceState(null, "", url);
}

export function summarizeStepsProgress(
  steps: PathStepView[],
  budgetHours: number | null,
): PathProgress {
  const progressSteps = steps.map((step) => ({ status: step.status, hours: step.courseHours }));
  return summarizePathProgress(progressSteps, budgetHours);
}
