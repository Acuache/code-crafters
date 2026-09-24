import Image from "next/image";
import type { RefObject } from "react";
import {
  ArrowSquareOutIcon,
  BookOpenTextIcon,
  ClockIcon,
  ExamIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import { LevelBadge } from "@/components/brand/level-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { formatHours } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import type { PathStepView } from "./path-steps-view";
import { StepStatusToggle, type SelectableStepStatus } from "./step-status-toggle";

type StepDetailDialogProps = {
  // Separado de `step`: al cerrar, el paso sigue ahí para que el modal no quede vacío durante la
  // animación de salida.
  open: boolean;
  // Se lee del estado optimista de path-steps-view.tsx, así un cambio de estado se ve al instante
  // aquí, en el nodo y en el conector a la vez.
  step: PathStepView | null;
  stepNumber: number;
  // El nodo que abrió el modal: al cerrarse, el foco vuelve ahí (no hay DialogTrigger).
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onStatusChange: (status: SelectableStepStatus) => void;
  onDiscard: () => void;
  quizzesEnabled: boolean;
  // null = quiz del curso; un título = práctica de ese capítulo.
  onOpenQuiz: (chapterTitle: string | null) => void;
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
  quizzesEnabled,
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
            quizzesEnabled={quizzesEnabled}
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
  quizzesEnabled: boolean;
  onOpenQuiz: (chapterTitle: string | null) => void;
};

function StepDetail({
  step,
  stepNumber,
  onStatusChange,
  onDiscard,
  quizzesEnabled,
  onOpenQuiz,
}: StepDetailProps) {
  // Mismo guard que step-row.tsx: sin él, el toggle recibiría un estado sin opción para mostrar.
  if (step.status === "discarded") {
    return null;
  }

  const isDone = step.status === "done";
  const canBeDiscarded = step.status === "pending";

  return (
    <>
      <div className="relative aspect-[760/420] w-full shrink-0 bg-muted">
        {step.courseImageUrl ? (
          <Image
            src={step.courseImageUrl}
            alt={`Portada del curso ${step.courseTitle}`}
            fill
            sizes="(min-width: 640px) 512px, 100vw"
            className={cn("object-cover", isDone && "opacity-50 grayscale")}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <BookOpenTextIcon className="size-10" aria-hidden="true" />
          </div>
        )}
        {/* Cerrar propio en vez del de DialogContent: va sobre la portada y necesita fondo sólido
            para no perderse contra la imagen. */}
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
      </div>

      <div className="flex flex-col gap-5 p-6">
        <DialogHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Paso {stepNumber}
            </span>
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

        {quizzesEnabled ? (
          <QuizSection chapters={step.courseChapters} isDone={isDone} onOpenQuiz={onOpenQuiz} />
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
  chapters: string[];
  isDone: boolean;
  onOpenQuiz: (chapterTitle: string | null) => void;
};

// Quizzes generados con IA (aporte de Ariel, ADR 0005). Aprobar el del curso es otra forma de
// marcarlo "Hecho"; los de capítulo son práctica y no cambian el estado.
function QuizSection({ chapters, isDone, onOpenQuiz }: QuizSectionProps) {
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
            : "Aprueba el quiz del curso (60 %) y lo marcamos como hecho."}
        </span>
      </div>

      <Button variant="outline" onClick={() => onOpenQuiz(null)}>
        Rendir quiz del curso
      </Button>

      {chapters.length > 0 ? (
        <Accordion>
          <AccordionItem value="chapters">
            <AccordionTrigger className="py-2">Practicar por capítulo</AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-1">
                {chapters.map((chapter) => (
                  <li key={chapter} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-pretty">{chapter}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenQuiz(chapter)}
                      aria-label={`Practicar el capítulo ${chapter}`}
                    >
                      Practicar
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
