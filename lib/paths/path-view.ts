import type { Database, Tables } from "@/lib/supabase/database.types";

export type StepUiStatus = "locked" | "available" | "in_progress" | "done" | "discarded";
type CourseView = Pick<Tables<"courses">, "id" | "slug" | "title" | "summary" | "hours" | "chapters" | "url">;
type PathRow = Pick<Tables<"learning_paths">, "id" | "title" | "summary" | "budget_hours">;

export type PathStepInput = {
  id: string; stage: number; position: number; origin: "requerido" | "recomendado" | "opcional" | "interes";
  reason: string; status: Database["public"]["Enums"]["path_step_status"];
  discard_reason: string | null; courses: CourseView;
};
export type PathViewInput = { path: PathRow; steps: PathStepInput[] };
export type PathStepView = Omit<PathStepInput, "courses" | "discard_reason"> & {
  uiStatus: StepUiStatus; course: CourseView; discardReason: string | null;
};
export type PathView = PathRow & {
  mainSteps: PathStepView[]; bonusSteps: PathStepView[]; discardedSteps: PathStepView[];
  progressPercentage: number; totalHours: number;
};

const ordered = (a: PathStepInput, b: PathStepInput) => a.stage - b.stage || a.position - b.position;

export function buildPathView({ path, steps }: PathViewInput): PathView {
  const sorted = [...steps].sort(ordered);
  const activeMain = sorted.filter((step) => step.status !== "discarded" && step.origin !== "opcional");
  const firstIncomplete = activeMain.findIndex((step) => step.status !== "done");
  const mapStep = (step: PathStepInput, index = -1): PathStepView => ({
    id: step.id, stage: step.stage, position: step.position, origin: step.origin,
    reason: step.reason, status: step.status, course: step.courses,
    discardReason: step.discard_reason,
    uiStatus: step.status === "discarded" ? "discarded" : step.status === "done" ? "done" :
      step.status === "in_progress" ? "in_progress" : index === firstIncomplete ? "available" : "locked",
  });
  const mainSteps = activeMain.map(mapStep);
  const bonusSteps = sorted.filter((step) => step.status !== "discarded" && step.origin === "opcional").map((step) => ({ ...mapStep(step), uiStatus: step.status === "done" ? "done" as const : "available" as const }));
  const discardedSteps = sorted.filter((step) => step.status === "discarded").map(mapStep);
  const doneCount = mainSteps.filter((step) => step.status === "done").length;
  return {
    ...path, mainSteps, bonusSteps, discardedSteps,
    progressPercentage: mainSteps.length ? Math.round((doneCount / mainSteps.length) * 100) : 0,
    totalHours: [...mainSteps, ...bonusSteps].reduce((sum, step) => sum + Number(step.course.hours), 0),
  };
}
