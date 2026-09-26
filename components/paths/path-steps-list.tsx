import { summarizeStepsProgress, type PathStepGroup, type PathStepView } from "./path-step";
import { StepGroupHeading } from "./step-group-heading";
import { StepRow, type StepRowOwnerActions } from "./step-row";
import type { SelectableStepStatus } from "./step-status-toggle";

export type PathStepsListOwnerActions = {
  onStatusChange: (stepId: string, status: SelectableStepStatus) => void;
  onDiscard: (step: PathStepView) => void;
  onOpenQuiz: (step: PathStepView) => void;
};

type PathStepsListProps = {
  groups: PathStepGroup[];
  stepNumbers: Map<string, number>;
  // Sin ellas, la lista es de solo lectura (ruta compartida, spec 15).
  ownerActions?: PathStepsListOwnerActions;
};

function rowOwnerActions(
  ownerActions: PathStepsListOwnerActions | undefined,
  step: PathStepView,
): StepRowOwnerActions | undefined {
  if (!ownerActions) {
    return undefined;
  }

  return {
    onStatusChange: (status) => ownerActions.onStatusChange(step.id, status),
    onDiscard: () => ownerActions.onDiscard(step),
    onOpenQuiz: () => ownerActions.onOpenQuiz(step),
  };
}

// Sin "use client" a propósito: recibe callbacks y solo se importa desde componentes cliente.
export function PathStepsList({ groups, stepNumbers, ownerActions }: PathStepsListProps) {
  const isReadOnly = ownerActions === undefined;

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-4">
          <StepGroupHeading
            group={group}
            progress={summarizeStepsProgress(group.steps, null)}
            showDoneCount={!isReadOnly}
            className="border-b pb-3"
          />
          <ol>
            {group.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                stepNumber={stepNumbers.get(step.id) ?? 0}
                ownerActions={rowOwnerActions(ownerActions, step)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
