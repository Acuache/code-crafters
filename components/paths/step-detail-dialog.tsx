import type { RefObject } from "react";
import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BookOpenTextIcon,
  ClipboardTextIcon,
  ExamIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
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
import { CourseDuration } from "./step-meta";
import { StepStatusToggle, type SelectableStepStatus } from "./step-status-toggle";

function describeStepOrigin(step: PathStepView): string {
  if (step.origin === "interes") {
    return "Sugerido según tus intereses.";
  }

  const originLabel = `${step.origin[0].toUpperCase()}${step.origin.slice(1)}`;
  const programLabel = step.programName ? ` de ${step.programName}` : "";
  return `${originLabel} en la ruta oficial${programLabel}.`;
}

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
        <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="shadow-sm">
            Paso {stepNumber}
          </Badge>
          <span className="inline-flex items-center rounded-full bg-background/85 px-2 py-1 shadow-sm backdrop-blur-sm">
            <CourseDuration hours={step.courseHours} />
          </span>
        </div>
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

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl leading-snug font-semibold text-pretty">
            {step.courseTitle}
          </DialogTitle>
          <DialogDescription className="text-pretty">{step.reason}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenTextIcon className="size-4 shrink-0 text-primary-bright" aria-hidden="true" />
            <span>{describeStepOrigin(step)}</span>
          </div>
          <StepStatusToggle
            value={step.status}
            onValueChange={onStatusChange}
            courseTitle={step.courseTitle}
            layout="segmented"
          />
        </div>

        {step.quiz ? (
          <QuizSection
            passPercentage={step.quiz.passPercentage}
            isDone={isDone}
            onOpenQuiz={onOpenQuiz}
          />
        ) : null}

        <div className="h-px bg-border/70" aria-hidden="true" />
        <DialogFooter className={canBeDiscarded ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
          {canBeDiscarded ? (
            <Button
              variant="outline"
              className="w-full border-border/70 bg-muted/20 px-2 text-xs whitespace-normal sm:text-sm"
              onClick={onDiscard}
            >
              <TrashIcon data-icon="inline-start" />
              Quitar de mi ruta
            </Button>
          ) : null}
          <Button
            variant="brand"
            className="w-full rounded-lg px-2 text-xs whitespace-normal sm:text-sm"
            render={<a href={step.courseUrl} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            <ArrowSquareOutIcon data-icon="inline-start" />
            Ver curso en DevTalles
            <ArrowRightIcon data-icon="inline-end" />
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
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/50 bg-linear-[135deg] from-primary/20 via-primary/10 to-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-bright">
          <ExamIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm leading-snug font-semibold">Pon a prueba lo que aprendiste</span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            {isDone
              ? `Apruebas con ${passPercentage} %. El curso ya está hecho; el quiz queda para repasar.`
              : `Aprueba el quiz del curso (${passPercentage} %) y lo marcamos como hecho.`}
          </span>
        </div>
      </div>

      <Button variant="brand" className="w-full rounded-lg" onClick={onOpenQuiz}>
        <ClipboardTextIcon data-icon="inline-start" />
        Rendir quiz del curso
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </div>
  );
}
