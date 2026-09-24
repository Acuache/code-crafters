import { summarizeStepsProgress, type PathStepGroup, type PathStepView } from "./path-step";
import { StepGroupHeading } from "./step-group-heading";
import { StepRow } from "./step-row";
import type { SelectableStepStatus } from "./step-status-toggle";

type PathStepsListProps = {
  groups: PathStepGroup[];
  stepNumbers: Map<string, number>;
  onStatusChange: (stepId: string, status: SelectableStepStatus) => void;
  onDiscard: (step: PathStepView) => void;
};

// Sin "use client" a propósito: recibe callbacks y solo se importa desde path-steps-view.tsx.
export function PathStepsList({
  groups,
  stepNumbers,
  onStatusChange,
  onDiscard,
}: PathStepsListProps) {
  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-4">
          <StepGroupHeading
            group={group}
            progress={summarizeStepsProgress(group.steps, null)}
            className="border-b pb-3"
          />
          <ol>
            {group.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                stepNumber={stepNumbers.get(step.id) ?? 0}
                onStatusChange={(status) => onStatusChange(step.id, status)}
                onDiscard={() => onDiscard(step)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
