"use client";

import { startTransition, useOptimistic, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon, ListBulletsIcon, MapTrifoldIcon, WarningIcon } from "@phosphor-icons/react";

import {
  discardStep,
  restoreStep,
  setStepStatus,
  submitQuizAttempt,
} from "@/app/(app)/paths/[id]/actions";
import { CelebrationDialog } from "@/components/gamification/celebration-dialog";
import { useCelebration } from "@/components/gamification/use-celebration";
import { Eyebrow } from "@/components/brand/eyebrow";
import { QuizDialog, type QuizSession } from "@/components/quizzes/quiz-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast, Toaster } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";
import { browserTimeZone } from "@/lib/gamification/streak";
import { groupStepsByTier } from "@/lib/progress/group-steps";
import { formatHours, USER_DISCARD_REASON } from "@/lib/progress/path-progress";
import { findNextStep } from "@/lib/progress/next-step";
import { cn } from "@/lib/utils";

import { BudgetCard } from "./budget-card";
import { DiscardedSteps } from "./discarded-steps";
import { PathMap } from "./path-map";
import {
  isPathView,
  summarizeStepsProgress,
  writeViewToUrl,
  type PathStepView,
  type PathView,
} from "./path-step";
import { PathStepsList } from "./path-steps-list";
import { StepDetail, StepDetailDialog } from "./step-detail-dialog";
import type { SelectableStepStatus } from "./step-status-toggle";

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

type PathStepsViewProps = {
  pathId: string;
  steps: PathStepView[];
  budgetHours: number | null;
  initialView: PathView;
  streakCard: ReactNode;
};

export function PathStepsView({
  pathId,
  steps,
  budgetHours,
  initialView,
  streakCard,
}: PathStepsViewProps) {
  const router = useRouter();
  // Si una action falla, el servidor no cambió nada: al terminar la transición la vista vuelve sola
  // a lo que dicen las props, sin rollback manual.
  const [optimisticSteps, applyOptimisticChange] = useOptimistic(steps, applyChange);
  const [view, setView] = useState<PathView>(initialView);
  // El panel y el modal leen el paso optimista por id para reflejar cada cambio.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // El nodo que abrió el modal, para devolverle el foco al cerrarlo.
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  // `key` del QuizDialog: cada apertura lo monta desde cero.
  const [quizDialogKey, setQuizDialogKey] = useState(0);
  const { celebrate, celebrationDialogProps } = useCelebration(
    isDetailOpen || quizSession !== null,
  );

  const activeSteps = optimisticSteps.filter((step) => step.status !== "discarded");
  const discardedSteps = optimisticSteps.filter((step) => step.status === "discarded");
  const groups = groupStepsByTier(activeSteps);
  // Numeración corrida sobre toda la ruta: coincide con el "N de M" de la tarjeta de progreso.
  const stepNumbers = new Map(activeSteps.map((step, index) => [step.id, index + 1]));
  const progress = summarizeStepsProgress(optimisticSteps, budgetHours);
  const selectedStep =
    activeSteps.find((step) => step.id === selectedStepId) ??
    findNextStep(activeSteps) ??
    activeSteps.at(-1) ??
    null;

  function runStepAction(
    change: OptimisticChange,
    action: () => Promise<ActionResult>,
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
    const step = optimisticSteps.find((candidate) => candidate.id === stepId);
    if (!step) {
      return;
    }

    // ADR 0007: con quiz, "Hecho" se gana aprobándolo.
    if (status === "done" && step.quiz) {
      openQuiz(step);
      return;
    }

    // El modal de logro espera la coreografía del mapa, que arranca con el cambio optimista.
    const mapChoreographyStartedAt = status === "done" && view === "mapa" ? Date.now() : null;

    runStepAction(
      { type: "status", stepId, status },
      async () => {
        const result = await setStepStatus(stepId, status, browserTimeZone());
        if (result.ok && result.gamification) {
          celebrate({
            events: result.gamification,
            courseTitle: step.courseTitle,
            mapChoreographyStartedAt,
          });
        }

        return result;
      },
      status === "done" ? () => setSelectedStepId(null) : undefined,
    );
  }

  function handleRestore(stepId: string) {
    runStepAction({ type: "restore", stepId }, () => restoreStep(stepId));
  }

  function handleDiscard(step: PathStepView) {
    runStepAction(
      { type: "discard", stepId: step.id },
      () => discardStep(step.id),
      () => {
        setSelectedStepId(null);
        showUndoToast(step);
      },
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

  function handleViewChange(value: unknown) {
    if (!isPathView(value)) {
      return;
    }

    setView(value);
    writeViewToUrl(value);
  }

  function openStepDetail(stepId: string, trigger: HTMLButtonElement) {
    detailTriggerRef.current = trigger;
    setSelectedStepId(stepId);
    setIsDetailOpen(!window.matchMedia("(min-width: 64rem)").matches);
  }

  // Marcar "Hecho" cierra el modal para que se vea el pop del nodo y cómo se rellena el camino.
  function changeStatusFromDetail(stepId: string, status: SelectableStepStatus) {
    if (status === "done") {
      setIsDetailOpen(false);
    }

    handleStatusChange(stepId, status);
  }

  function discardFromDetail(step: PathStepView) {
    setIsDetailOpen(false);
    handleDiscard(step);
  }

  function openQuiz(step: PathStepView) {
    if (!step.quiz) {
      return;
    }

    // Se cierra el detalle para no apilar dos diálogos.
    setIsDetailOpen(false);
    setQuizDialogKey((key) => key + 1);
    setQuizSession({
      quiz: step.quiz,
      courseTitle: step.courseTitle,
      pathId,
      pathStepId: step.id,
    });
  }

  return (
    <Toaster>
      <div className="grid gap-6 lg:grid-cols-[208px_minmax(320px,1fr)_320px] xl:grid-cols-[232px_minmax(320px,1fr)_336px]">
        <section
          className={cn(
            "order-1 flex min-w-0 flex-col gap-6 lg:order-2",
            view === "lista" && "lg:col-span-2",
          )}
        >
          <div className="flex flex-col gap-2 lg:hidden">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">Tu avance</span>
              <span className="text-muted-foreground tabular-nums">
                {progress.doneCount} de {progress.activeCount} cursos · {progress.percentDone} %
              </span>
            </div>
            <Progress
              value={progress.percentDone}
              aria-label={`Avance de tu ruta: ${progress.percentDone} %`}
            />
            {!progress.fitsInBudget ? (
              <p className="text-xs text-destructive">
                Tu plan supera el tiempo disponible por {formatHours(progress.overflowHours)}.
              </p>
            ) : null}
          </div>

          <Tabs value={view} onValueChange={handleViewChange} className="gap-4">
            <TabsList className="self-center lg:self-end">
              <TabsTrigger value="mapa" className="px-4">
                <MapTrifoldIcon data-icon="inline-start" />
                Mapa
              </TabsTrigger>
              <TabsTrigger value="lista" className="px-4">
                <ListBulletsIcon data-icon="inline-start" />
                Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mapa">
              <PathMap
                groups={groups}
                stepNumbers={stepNumbers}
                totalSteps={activeSteps.length}
                selectedStepId={selectedStepId}
                onOpenStep={openStepDetail}
              />
            </TabsContent>

            <TabsContent value="lista">
              <PathStepsList
                groups={groups}
                stepNumbers={stepNumbers}
                ownerActions={{
                  onStatusChange: handleStatusChange,
                  onDiscard: handleDiscard,
                  onOpenQuiz: openQuiz,
                }}
              />
            </TabsContent>
          </Tabs>

          <DiscardedSteps steps={discardedSteps} onRestore={handleRestore} />
        </section>

        <aside className="order-2 flex flex-col gap-4 lg:sticky lg:top-6 lg:order-1 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
          <div className="hidden lg:block">
            <BudgetCard progress={progress} budgetHours={budgetHours} compact />
          </div>
          <details className="group rounded-2xl border bg-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex-1">Tu plan de estudio</span>
              {!progress.fitsInBudget ? (
                <WarningIcon aria-hidden="true" className="text-destructive" />
              ) : null}
              <span className="text-muted-foreground tabular-nums">
                {formatHours(progress.activeHours)}
              </span>
              <CaretDownIcon
                aria-hidden="true"
                className="group-open:rotate-180 motion-safe:transition-transform"
              />
            </summary>
            <div className="px-3 pb-3">
              <BudgetCard progress={progress} budgetHours={budgetHours} />
            </div>
          </details>
          {streakCard}
        </aside>

        <aside
          aria-label="Detalle del curso"
          className={cn(
            "order-3 hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto",
            view === "lista" && "lg:hidden",
          )}
        >
          <div className="overflow-hidden rounded-2xl border bg-card shadow-brand">
            <div className="border-b px-5 py-3">
              <Eyebrow>Explora tu curso</Eyebrow>
            </div>
            {selectedStep ? (
              <div
                key={selectedStep.id}
                className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
              >
                <StepDetail
                  mode="panel"
                  step={selectedStep}
                  stepNumber={stepNumbers.get(selectedStep.id) ?? 0}
                  onStatusChange={(status) => changeStatusFromDetail(selectedStep.id, status)}
                  onDiscard={() => discardFromDetail(selectedStep)}
                  onOpenQuiz={() => openQuiz(selectedStep)}
                />
              </div>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">Esta ruta aún no tiene cursos.</p>
            )}
          </div>
        </aside>
      </div>

      <StepDetailDialog
        open={isDetailOpen}
        step={selectedStep}
        stepNumber={selectedStep ? (stepNumbers.get(selectedStep.id) ?? 0) : 0}
        returnFocusRef={detailTriggerRef}
        onClose={() => setIsDetailOpen(false)}
        onStatusChange={(status) => {
          if (selectedStep) {
            changeStatusFromDetail(selectedStep.id, status);
          }
        }}
        onDiscard={() => {
          if (selectedStep) {
            discardFromDetail(selectedStep);
          }
        }}
        onOpenQuiz={() => {
          if (selectedStep) {
            openQuiz(selectedStep);
          }
        }}
      />

      <QuizDialog
        key={quizDialogKey}
        session={quizSession}
        onClose={() => setQuizSession(null)}
        // El servidor pudo marcar el paso y sumar la racha.
        onAttemptSaved={(result) => {
          router.refresh();
          if (result.passed) {
            setSelectedStepId(null);
          }
          if (result.gamification && quizSession) {
            celebrate({
              events: result.gamification,
              courseTitle: quizSession.courseTitle,
              mapChoreographyStartedAt: null,
            });
          }
        }}
        submitAttemptAction={submitQuizAttempt}
      />

      <CelebrationDialog {...celebrationDialogProps} />
    </Toaster>
  );
}
