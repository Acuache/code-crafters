"use client";

import { startTransition, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListBulletsIcon, MapTrifoldIcon } from "@phosphor-icons/react";

import {
  discardStep,
  requestQuiz,
  restoreStep,
  setStepStatus,
  submitQuizAttempt,
} from "@/app/(app)/paths/[id]/actions";
import { QuizDialog, type QuizTarget } from "@/components/quizzes/quiz-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, Toaster } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";
import { browserTimeZone } from "@/lib/gamification/streak";
import { groupStepsByProgram } from "@/lib/progress/group-steps";
import { USER_DISCARD_REASON } from "@/lib/progress/path-progress";

import { BudgetCard } from "./budget-card";
import { DiscardedSteps } from "./discarded-steps";
import { PathMap } from "./path-map";
import { summarizeStepsProgress, type PathStepView, type PathView } from "./path-step";
import { PathStepsList } from "./path-steps-list";
import { StepDetailDialog } from "./step-detail-dialog";
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

function isPathView(value: unknown): value is PathView {
  return value === "mapa" || value === "lista";
}

// La vista vive en la URL para que recargar o compartir el link la conserve. replaceState y no
// router.replace: la página es dinámica y router.replace volvería a pedir el Server Component solo
// para cambiar de pestaña. Next sincroniza replaceState con su router.
function writeViewToUrl(view: PathView) {
  const url = new URL(window.location.href);
  if (view === "lista") {
    url.searchParams.set("vista", "lista");
  } else {
    url.searchParams.delete("vista");
  }

  window.history.replaceState(null, "", url);
}

type PathStepsViewProps = {
  pathId: string;
  steps: PathStepView[];
  budgetHours: number | null;
  initialView: PathView;
  quizzesEnabled: boolean;
};

export function PathStepsView({
  pathId,
  steps,
  budgetHours,
  initialView,
  quizzesEnabled,
}: PathStepsViewProps) {
  const router = useRouter();
  // Si una action falla, el servidor no cambió nada: al terminar la transición la vista vuelve sola
  // a lo que dicen las props, sin rollback manual.
  const [optimisticSteps, applyOptimisticChange] = useOptimistic(steps, applyChange);
  const [view, setView] = useState<PathView>(initialView);
  // Se guarda el id y no el paso: el modal lee el paso de optimisticSteps y refleja cada cambio.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // El nodo que abrió el modal, para devolverle el foco al cerrarlo.
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const [quizTarget, setQuizTarget] = useState<QuizTarget | null>(null);
  // `key` del QuizDialog: cada apertura lo monta desde cero.
  const [quizSession, setQuizSession] = useState(0);

  const activeSteps = optimisticSteps.filter((step) => step.status !== "discarded");
  const discardedSteps = optimisticSteps.filter((step) => step.status === "discarded");
  const groups = groupStepsByProgram(activeSteps);
  // Numeración corrida sobre toda la ruta: coincide con el "N de M" de la tarjeta de progreso.
  const stepNumbers = new Map(activeSteps.map((step, index) => [step.id, index + 1]));
  const progress = summarizeStepsProgress(optimisticSteps, budgetHours);
  const selectedStep = optimisticSteps.find((step) => step.id === selectedStepId) ?? null;

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
    runStepAction({ type: "status", stepId, status }, () =>
      setStepStatus(stepId, status, browserTimeZone()),
    );
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
    setIsDetailOpen(true);
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

  function openQuiz(stepId: string, chapterTitle: string | null) {
    // Se cierra el detalle para no apilar dos diálogos.
    setIsDetailOpen(false);
    setQuizSession((session) => session + 1);
    setQuizTarget({
      pathId,
      pathStepId: stepId,
      kind: chapterTitle ? "chapter" : "course",
      chapterTitle,
    });
  }

  return (
    <Toaster>
      <div className="flex flex-col gap-10">
        <BudgetCard progress={progress} budgetHours={budgetHours} />

        <Tabs value={view} onValueChange={handleViewChange} className="gap-8">
          <TabsList className="self-center">
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
              onOpenStep={openStepDetail}
            />
          </TabsContent>

          <TabsContent value="lista">
            <PathStepsList
              groups={groups}
              stepNumbers={stepNumbers}
              onStatusChange={handleStatusChange}
              onDiscard={handleDiscard}
            />
          </TabsContent>
        </Tabs>

        <DiscardedSteps steps={discardedSteps} onRestore={handleRestore} />
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
        quizzesEnabled={quizzesEnabled}
        onOpenQuiz={(chapterTitle) => {
          if (selectedStep) {
            openQuiz(selectedStep.id, chapterTitle);
          }
        }}
      />

      <QuizDialog
        key={quizSession}
        target={quizTarget}
        onClose={() => setQuizTarget(null)}
        // El servidor pudo marcar el paso y sumar la racha.
        onAttemptSaved={() => router.refresh()}
        requestQuizAction={requestQuiz}
        submitAttemptAction={submitQuizAttempt}
      />
    </Toaster>
  );
}
