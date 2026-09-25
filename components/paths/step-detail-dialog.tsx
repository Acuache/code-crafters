import type { RefObject } from "react";
import { ArrowSquareOutIcon, ExamIcon, TrashIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CourseCover } from "./course-cover";
import type { PathStepView } from "./path-step";
import { CourseDuration, StepOriginBadge } from "./step-meta";
import { StepStatusToggle, type SelectableStepStatus } from "./step-status-toggle";

type StepDetailDialogProps = {
  // Separado de `step`: al cerrar, el paso sigue ahí y el modal no queda vacío mientras se anima.
  open: boolean;
  step: PathStepView | null;
  stepNumber: number;
  // No hay DialogTrigger: al cerrar, el foco vuelve al nodo que abrió el modal.
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onStatusChange: (status: SelectableStepStatus) => void;
  onDiscard: () => void;
  onOpenQuiz: () => void;
};

// Sin "use client" a propósito: recibe callbacks y solo se importa desde path-steps-view.tsx.
export function StepDetailDialog({
  open,
  step,
  stepNumber,
  returnFocusRef,
  onClose,
  onStatusChange,
  onDiscard,
  onOpenQuiz,
}: StepDetailDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        finalFocus={returnFocusRef}
        className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {step ? (
          <StepDetail
            step={step}
            stepNumber={stepNumber}
            onStatusChange={onStatusChange}
            onDiscard={onDiscard}
            onOpenQuiz={onOpenQuiz}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type StepDetailProps = {
  step: PathStepView;
  stepNumber: number;
  onStatusChange: (status: SelectableStepStatus) => void;
  onDiscard: () => void;
  onOpenQuiz: () => void;
};

function StepDetail({ step, stepNumber, onStatusChange, onDiscard, onOpenQuiz }: StepDetailProps) {
  // Mismo guard que step-row.tsx: el toggle no tiene opción para un paso descartado.
  if (step.status === "discarded") {
    return null;
  }

  const isDone = step.status === "done";
  const canBeDiscarded = step.status === "pending";

  return (
    <>
      <CourseCover
        imageUrl={step.courseImageUrl}
        alt={`Portada del curso ${step.courseTitle}`}
        sizes="(min-width: 640px) 512px, 100vw"
        isDimmed={isDone}
        className="w-full"
        iconClassName="size-10"
      >
        {/* Cerrar propio: va sobre la portada y necesita fondo sólido para no perderse. */}
        <DialogClose
          render={
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute top-3 right-3 rounded-full shadow-md"
            />
          }
        >
          <XIcon />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
      </CourseCover>

      <div className="flex flex-col gap-5 p-6">
        <DialogHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Paso {stepNumber}
            </span>
            <StepOriginBadge origin={step.origin} />
            <CourseDuration hours={step.courseHours} />
          </div>
          <DialogTitle className="text-xl leading-snug font-semibold text-pretty">
            {step.courseTitle}
          </DialogTitle>
          {step.programName ? (
            <span className="text-sm text-muted-foreground">{step.programName}</span>
          ) : null}
          <DialogDescription className="text-pretty">{step.reason}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Estado</span>
          <StepStatusToggle
            value={step.status}
            onValueChange={onStatusChange}
            courseTitle={step.courseTitle}
          />
        </div>

        {step.quiz ? (
          <QuizSection
            passPercentage={step.quiz.passPercentage}
            isDone={isDone}
            onOpenQuiz={onOpenQuiz}
          />
        ) : null}

        <DialogFooter>
          {canBeDiscarded ? (
            <Button variant="ghost" onClick={onDiscard}>
              <TrashIcon data-icon="inline-start" />
              Quitar de mi ruta
            </Button>
          ) : null}
          <Button
            render={<a href={step.courseUrl} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            Ver curso en DevTalles
            <ArrowSquareOutIcon data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}

type QuizSectionProps = {
  passPercentage: number;
  isDone: boolean;
  onOpenQuiz: () => void;
};

// Aprobar el quiz también marca el curso "Hecho", la otra forma además del toggle.
function QuizSection({ passPercentage, isDone, onOpenQuiz }: QuizSectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <ExamIcon className="text-primary-bright" aria-hidden="true" />
          Pon a prueba lo que aprendiste
        </span>
        <span className="text-xs text-muted-foreground">
          {isDone
            ? "Ya está hecho: el quiz queda para repasar."
            : `Aprueba el quiz del curso (${passPercentage} %) y lo marcamos como hecho.`}
        </span>
      </div>

      <Button variant="outline" onClick={onOpenQuiz}>
        Rendir quiz del curso
      </Button>
    </div>
  );
}
