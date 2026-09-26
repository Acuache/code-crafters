import { useEffect, useState } from "react";

import { mainCelebration, type CelebrationEvents } from "@/lib/gamification/summary";
import { ARRIVAL_DELAY_MS } from "@/lib/path-map/motion";

import { launchConfetti } from "./celebrate";
import { showCourseCompletedToast, type Celebration } from "./celebration-dialog";

// Lo que tardan el detalle y el quiz en cerrarse y devolver el foco.
const AFTER_OTHER_DIALOG_MS = 150;

type PendingCelebration = Celebration & {
  // Date.now() a partir del cual se puede mostrar.
  readyAt: number;
};

export type CelebrationTrigger = {
  events: CelebrationEvents;
  courseTitle: string;
  // null si no hay que esperar la coreografía del mapa.
  mapChoreographyStartedAt: number | null;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Desde el click: la action puede volver antes o después de que llegue la mascota.
function modalReadyAt(mapChoreographyStartedAt: number | null): number {
  if (mapChoreographyStartedAt === null || prefersReducedMotion()) {
    return 0;
  }

  return mapChoreographyStartedAt + ARRIVAL_DELAY_MS;
}

// Con logro mayor, el XP va dentro del modal: un toast aparte le taparía el botón en móvil.
export function useCelebration(isAnotherDialogOpen: boolean) {
  const [pending, setPending] = useState<PendingCelebration[]>([]);
  // Aparte de isModalOpen: el contenido sigue visible mientras el modal se cierra.
  const [shown, setShown] = useState<Celebration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const next = pending[0] ?? null;

  useEffect(() => {
    if (!next || isModalOpen || isAnotherDialogOpen) {
      return;
    }

    const delay = Math.max(AFTER_OTHER_DIALOG_MS, next.readyAt - Date.now());
    const timeout = window.setTimeout(() => {
      setPending((current) => current.slice(1));

      if (mainCelebration(next.events) === null) {
        const gainedXp = next.events.completedCourse?.gainedXp ?? 0;
        showCourseCompletedToast(next.courseTitle, gainedXp);
        return;
      }

      setShown({ events: next.events, courseTitle: next.courseTitle });
      setIsModalOpen(true);
      launchConfetti().catch((error: unknown) => {
        console.error("[gamification] confetti:", error);
      });
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [next, isModalOpen, isAnotherDialogOpen]);

  function celebrate({ events, courseTitle, mapChoreographyStartedAt }: CelebrationTrigger) {
    const hasModal = mainCelebration(events) !== null;
    if (!hasModal && !events.completedCourse) {
      return;
    }

    // Un toast solo no espera la coreografía; sí espera a que se cierre el quiz.
    const readyAt = hasModal ? modalReadyAt(mapChoreographyStartedAt) : 0;
    setPending((current) => [...current, { events, courseTitle, readyAt }]);
  }

  return {
    celebrate,
    celebrationDialogProps: {
      open: isModalOpen,
      celebration: shown,
      onClose: () => setIsModalOpen(false),
    },
  };
}
