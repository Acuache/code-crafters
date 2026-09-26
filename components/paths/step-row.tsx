import { ArrowSquareOutIcon, CheckIcon, ExamIcon, TrashIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CourseCover } from "./course-cover";
import type { PathStepView } from "./path-step";
import { CourseDuration, StepOriginBadge } from "./step-meta";
import { stepNodeClassName } from "./step-node-style";
import { StepStatusToggle, type SelectableStepStatus } from "./step-status-toggle";

export type StepRowOwnerActions = {
  onStatusChange: (status: SelectableStepStatus) => void;
  onDiscard: () => void;
  onOpenQuiz: () => void;
};

type StepRowProps = {
  step: PathStepView;
  // Número dentro de toda la ruta, no dentro del grupo.
  stepNumber: number;
  // Sin ellas, la fila es de solo lectura (ruta compartida, spec 15): solo "Ver curso".
  ownerActions?: StepRowOwnerActions;
};

export function StepRow({ step, stepNumber, ownerActions }: StepRowProps) {
  // Un descartado nunca llega acá, pero el tipo lo admite y el toggle no tiene opción para él.
  if (step.status === "discarded") {
    return null;
  }

  const isDone = step.status === "done";
  const isInProgress = step.status === "in_progress";
  const canBeDiscarded = step.status === "pending";

  return (
    <li className="group/step flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-heading text-sm font-semibold tabular-nums transition-colors",
            stepNodeClassName(step.status),
          )}
        >
          {isDone ? <CheckIcon weight="bold" aria-label="Hecho" /> : stepNumber}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "my-2 w-0.5 flex-1 rounded-full group-last/step:hidden",
            isDone ? "bg-primary-bright/60" : "bg-border",
          )}
        />
      </div>

      <article
        className={cn(
          "mb-6 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card transition-shadow group-last/step:mb-0 sm:flex-row",
          isInProgress && "border-primary-bright/60 shadow-brand",
        )}
      >
        <CourseCover
          imageUrl={step.courseImageUrl}
          alt={`Portada del curso ${step.courseTitle}`}
          sizes="(min-width: 640px) 208px, 100vw"
          isDimmed={isDone}
          className="w-full sm:w-52"
          iconClassName="size-8"
        >
          {isInProgress ? (
            <Badge className="absolute top-2 left-2 shadow-brand-glow">En curso</Badge>
          ) : null}
        </CourseCover>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <StepOriginBadge origin={step.origin} />
              <CourseDuration hours={step.courseHours} />
            </div>
            <h3
              className={cn(
                "font-heading text-base leading-snug font-semibold text-pretty",
                isDone && "text-muted-foreground",
              )}
            >
              {step.courseTitle}
            </h3>
            <p className="text-sm text-pretty text-muted-foreground">{step.reason}</p>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            {ownerActions ? (
              <StepStatusToggle
                value={step.status}
                onValueChange={ownerActions.onStatusChange}
                courseTitle={step.courseTitle}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-1">
              {ownerActions && step.quiz ? (
                <Button variant="outline" size="sm" onClick={ownerActions.onOpenQuiz}>
                  <ExamIcon data-icon="inline-start" />
                  Rendir quiz del curso
                </Button>
              ) : null}
              {ownerActions && canBeDiscarded ? (
                <Button variant="ghost" size="sm" onClick={ownerActions.onDiscard}>
                  <TrashIcon data-icon="inline-start" />
                  Quitar
                </Button>
              ) : null}
              <Button
                variant="link"
                size="sm"
                render={<a href={step.courseUrl} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
              >
                Ver curso
                <ArrowSquareOutIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
