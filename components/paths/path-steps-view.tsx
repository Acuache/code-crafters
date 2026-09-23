"use client";

import { startTransition, useOptimistic } from "react";

import {
  discardStep,
  restoreStep,
  setStepStatus,
  type StepActionResult,
} from "@/app/(app)/paths/[id]/actions";
import { Eyebrow } from "@/components/brand/eyebrow";
import { toast, Toaster } from "@/components/ui/toast";
import type { StepOrigin } from "@/lib/paths/types";
import {
  formatHours,
  summarizePathProgress,
  USER_DISCARD_REASON,
  type PathStepStatus,
} from "@/lib/progress/path-progress";

import { BudgetCard } from "./budget-card";
import { DiscardedSteps } from "./discarded-steps";
import { StepRow } from "./step-row";
import type { SelectableStepStatus } from "./step-status-toggle";

// Una fila de path_steps ya aplanada por app/(app)/paths/[id]/page.tsx, con el curso y el
// programa embebidos.
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
  programSlug: string | null;
  programName: string | null;
};

type OptimisticChange =
  | { type: "status"; stepId: string; status: SelectableStepStatus }
  | { type: "discard"; stepId: string }
  | { type: "restore"; stepId: string };

function applyChange(steps: PathStepView[], change: OptimisticChange): PathStepView[] {
  return steps.map((step) => {
    if (step.id !== change.stepId) {
      return step;
    }

    if (change.type === "status") {
      return { ...step, status: change.status };
    }

    if (change.type === "discard") {
      return { ...step, status: "discarded", discardReason: USER_DISCARD_REASON };
    }

    return { ...step, status: "pending", discardReason: null };
  });
}

type StepGroup = {
  key: string;
  title: string;
  steps: PathStepView[];
};

const INTERESTS_GROUP_KEY = "intereses";

// Los pasos llegan ordenados por stage/position, y el motor numera los stage de forma contigua
// por programa (renumberStages en lib/paths/build-path.ts): agrupar en orden de aparición no
// reordena el plan de estudio. Los de interés van siempre al final, como los deja el motor.
function groupByProgram(activeSteps: PathStepView[]): StepGroup[] {
  const programGroups = new Map<string, StepGroup>();
  const interestGroup: StepGroup = {
    key: INTERESTS_GROUP_KEY,
    title: "Por tus intereses",
    steps: [],
  };

  for (const step of activeSteps) {
    if (step.origin === "interes") {
      interestGroup.steps.push(step);
      continue;
    }

    const groupKey = step.programSlug ?? "sin-programa";
    let group = programGroups.get(groupKey);
    if (!group) {
      group = { key: groupKey, title: step.programName ?? "Otros cursos", steps: [] };
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

type PathStepsViewProps = {
  steps: PathStepView[];
  budgetHours: number | null;
};

export function PathStepsView({ steps, budgetHours }: PathStepsViewProps) {
  // Si una action falla, el servidor no cambió nada: al terminar la transición el valor optimista
  // deja de aplicarse y la vista vuelve sola a lo que dicen las props, sin rollback manual.
  const [optimisticSteps, applyOptimisticChange] = useOptimistic(steps, applyChange);

  const activeSteps = optimisticSteps.filter((step) => step.status !== "discarded");
  const discardedSteps = optimisticSteps.filter((step) => step.status === "discarded");
  // Numeración corrida sobre toda la ruta (no por grupo): quitar un paso renumera los siguientes,
  // así el número siempre coincide con "paso N de M" de la tarjeta de progreso.
  const stepNumbers = new Map(activeSteps.map((step, index) => [step.id, index + 1]));
  const progress = summarizePathProgress(
    optimisticSteps.map((step) => ({ status: step.status, hours: step.courseHours })),
    budgetHours,
  );

  function runStepAction(
    change: OptimisticChange,
    action: () => Promise<StepActionResult>,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      applyOptimisticChange(change);
      const result = await action();

      if (!result.ok) {
        toast.add({ type: "error", title: result.message });
        return;
      }

      onSuccess?.();
    });
  }

  function handleStatusChange(stepId: string, status: SelectableStepStatus) {
    runStepAction({ type: "status", stepId, status }, () => setStepStatus(stepId, status));
  }

  function handleRestore(stepId: string) {
    runStepAction({ type: "restore", stepId }, () => restoreStep(stepId));
  }

  function handleDiscard(step: PathStepView) {
    runStepAction(
      { type: "discard", stepId: step.id },
      () => discardStep(step.id),
      () => showUndoToast(step),
    );
  }

  function showUndoToast(step: PathStepView) {
    const toastId = toast.add({
      title: `Quitaste «${step.courseTitle}» de tu ruta`,
      actionProps: {
        children: "Deshacer",
        onClick: () => {
          toast.close(toastId);
          handleRestore(step.id);
        },
      },
    });
  }

  return (
    <Toaster>
      <div className="flex flex-col gap-10">
        <BudgetCard progress={progress} budgetHours={budgetHours} />

        {groupByProgram(activeSteps).map((group) => {
          const groupProgress = summarizePathProgress(
            group.steps.map((step) => ({ status: step.status, hours: step.courseHours })),
            null,
          );
          const isInterestGroup = group.key === INTERESTS_GROUP_KEY;

          return (
            <section key={group.key} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
                <div className="flex flex-col gap-1">
                  <Eyebrow>{isInterestGroup ? "Extra" : "Programa oficial"}</Eyebrow>
                  <h2 className="font-heading text-xl font-semibold">{group.title}</h2>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {groupProgress.doneCount} de {groupProgress.activeCount} hechos ·{" "}
                  {formatHours(groupProgress.activeHours)}
                </span>
              </div>
              <ol>
                {group.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    stepNumber={stepNumbers.get(step.id) ?? 0}
                    onStatusChange={(status) => handleStatusChange(step.id, status)}
                    onDiscard={() => handleDiscard(step)}
                  />
                ))}
              </ol>
            </section>
          );
        })}

        <DiscardedSteps steps={discardedSteps} onRestore={handleRestore} />
      </div>
    </Toaster>
  );
}
