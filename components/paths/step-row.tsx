import Image from "next/image";
import {
  ArrowSquareOutIcon,
  BookOpenTextIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { LevelBadge } from "@/components/brand/level-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import type { PathStepView } from "./path-steps-view";
import { StepStatusToggle, type SelectableStepStatus } from "./step-status-toggle";

type StepRowProps = {
  step: PathStepView;
  // Número del paso dentro de toda la ruta (1..N sobre los vigentes), no dentro del grupo.
  stepNumber: number;
  onStatusChange: (status: SelectableStepStatus) => void;
  onDiscard: () => void;
};

export function StepRow({ step, stepNumber, onStatusChange, onDiscard }: StepRowProps) {
  // Un paso descartado nunca llega acá (vive en el acordeón), pero el tipo lo admite: sin este
  // guard, el toggle recibiría un estado que no tiene opción para mostrar.
  if (step.status === "discarded") {
    return null;
  }

  const isDone = step.status === "done";
  const isInProgress = step.status === "in_progress";
  const canBeDiscarded = step.status === "pending";

  return (
    <li className="group/step flex gap-4">
      {/* Línea de tiempo: el nodo muestra el número del paso, o un check si ya está hecho. */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-heading text-sm font-semibold tabular-nums transition-colors",
            isDone && "border-primary-bright bg-primary-bright text-primary-bright-foreground",
            isInProgress && "border-primary bg-primary text-primary-foreground shadow-brand-glow",
            !isDone && !isInProgress && "border-border bg-card text-muted-foreground",
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
        <div className="relative aspect-[760/420] w-full shrink-0 bg-muted sm:w-52">
          {step.courseImageUrl ? (
            <Image
              src={step.courseImageUrl}
              alt={`Portada del curso ${step.courseTitle}`}
              fill
              sizes="(min-width: 640px) 208px, 100vw"
              className={cn("object-cover transition", isDone && "opacity-50 grayscale")}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <BookOpenTextIcon className="size-8" aria-hidden="true" />
            </div>
          )}
          {isInProgress ? (
            <Badge className="absolute top-2 left-2 shadow-brand-glow">En curso</Badge>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {step.origin === "interes" ? (
                <Badge variant="outline">interés</Badge>
              ) : (
                <LevelBadge nivel={step.origin} />
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon aria-hidden="true" />
                {formatHours(step.courseHours)}
              </span>
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
            <StepStatusToggle
              value={step.status}
              onValueChange={onStatusChange}
              courseTitle={step.courseTitle}
            />
            <div className="flex items-center gap-1">
              {canBeDiscarded ? (
                <Button variant="ghost" size="sm" onClick={onDiscard}>
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
