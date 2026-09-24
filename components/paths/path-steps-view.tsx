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
  type StepActionResult,
} from "@/app/(app)/paths/[id]/actions";
import { Eyebrow } from "@/components/brand/eyebrow";
import { QuizDialog, type QuizTarget } from "@/components/quizzes/quiz-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PathMap } from "./path-map";
import { StepDetailDialog } from "./step-detail-dialog";
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
  courseChapters: string[];
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
      return {
        ...step,
        status: "discarded",
        discardReason: USER_DISCARD_REASON,
      };
    }

    return { ...step, status: "pending", discardReason: null };
  });
}

export type StepGroup = {
  key: string;
  title: string;
  // El mapa (spec 12) lo lee en vez de importar INTERESTS_GROUP_KEY: así path-map.tsx solo importa
  // tipos de este archivo y no hay un ciclo de módulos entre los dos.
  isInterestGroup: boolean;
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
    isInterestGroup: true,
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
      group = {
        key: groupKey,
        title: step.programName ?? "Otros cursos",
        isInterestGroup: false,
        steps: [],
      };
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

// Spec 12: la ruta se ve como mapa (por defecto) o como la lista del spec 08.
export type PathView = "mapa" | "lista";

function isPathView(value: unknown): value is PathView {
  return value === "mapa" || value === "lista";
}

// La vista vive en la URL para que recargar o compartir el link la conserve. replaceState en vez
// de router.replace: la página es dinámica y router.replace volvería a pedir el Server Component
// (queries de la ruta y chequeo de IA) solo para cambiar de pestaña. Next.js sincroniza
// replaceState con su router de forma nativa.
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
  // false sin OPENAI_API_KEY o SUPABASE_SECRET_KEY: los botones de quiz no aparecen y la ruta
  // funciona igual con el toggle de estado.
  quizzesEnabled: boolean;
};

// La zona del navegador: el servidor la usa para saber qué día local cuenta para la racha.
function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function PathStepsView({
  pathId,
  steps,
  budgetHours,
  initialView,
  quizzesEnabled,
}: PathStepsViewProps) {
  const router = useRouter();
  // Si una action falla, el servidor no cambió nada: al terminar la transición el valor optimista
  // deja de aplicarse y la vista vuelve sola a lo que dicen las props, sin rollback manual.
  const [optimisticSteps, applyOptimisticChange] = useOptimistic(steps, applyChange);

  const activeSteps = optimisticSteps.filter((step) => step.status !== "discarded");
  const discardedSteps = optimisticSteps.filter((step) => step.status === "discarded");
  // Numeración corrida sobre toda la ruta (no por grupo): quitar un paso renumera los siguientes,
  // así el número siempre coincide con "paso N de M" de la tarjeta de progreso.
  const stepNumbers = new Map(activeSteps.map((step, index) => [step.id, index + 1]));
  const progress = summarizePathProgress(
    optimisticSteps.map((step) => ({
      status: step.status,
      hours: step.courseHours,
    })),
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

  const [view, setView] = useState<PathView>(initialView);
  // El paso del modal de detalle del mapa. Se guarda el id, no el paso: el modal lee el paso de
  // optimisticSteps y así refleja cada cambio de estado al instante.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // El nodo que abrió el modal, para devolverle el foco al cerrarlo.
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const selectedStep = optimisticSteps.find((step) => step.id === selectedStepId) ?? null;

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

  function discardFromDetail(step: PathStepView) {
    setIsDetailOpen(false);
    handleDiscard(step);
  }

  // Marcar "Hecho" cierra el modal: el paso ya no necesita nada más, y así se ve el pop del nodo y
  // cómo se rellena su tramo del camino. "Pendiente" y "En curso" lo dejan abierto.
  function changeStatusFromDetail(stepId: string, status: SelectableStepStatus) {
    if (status === "done") {
      setIsDetailOpen(false);
    }

    handleStatusChange(stepId, status);
  }

  function handleStatusChange(stepId: string, status: SelectableStepStatus) {
    runStepAction({ type: "status", stepId, status }, () =>
      setStepStatus(stepId, status, browserTimeZone()),
    );
  }

  // El quiz abierto; null = cerrado. Se abre desde el modal de detalle, que se cierra antes para no
  // apilar dos diálogos.
  const [quizTarget, setQuizTarget] = useState<QuizTarget | null>(null);
  // Cambia en cada apertura para montar un QuizDialog nuevo, con su estado desde cero.
  const [quizSession, setQuizSession] = useState(0);

  function openQuiz(stepId: string, chapterTitle: string | null) {
    setIsDetailOpen(false);
    setQuizSession((session) => session + 1);
    setQuizTarget({
      pathId,
      pathStepId: stepId,
      kind: chapterTitle ? "chapter" : "course",
      chapterTitle,
    });
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

  const groups = groupByProgram(activeSteps);

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

          <TabsContent value="lista" className="flex flex-col gap-10">
            {groups.map((group) => {
              const groupProgress = summarizePathProgress(
                group.steps.map((step) => ({
                  status: step.status,
                  hours: step.courseHours,
                })),
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
        // Aprobar el quiz del curso marca el paso como hecho y suma la racha en el servidor: se
        // vuelve a pedir la página para que el mapa y la racha lo muestren.
        onAttemptSaved={() => router.refresh()}
        requestQuizAction={requestQuiz}
        submitAttemptAction={submitQuizAttempt}
      />
    </Toaster>
  );
}
