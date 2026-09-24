import { useState, type CSSProperties } from "react";
import { CheckIcon } from "@phosphor-icons/react";

import { ARRIVAL_DELAY_MS } from "@/lib/path-map/motion";
import { LABEL_WIDTH, NODE_SIZE, type NodePosition } from "@/lib/path-map/zigzag-layout";
import { cn } from "@/lib/utils";

import type { PathStepView } from "./path-steps-view";

const STATUS_LABELS: Record<PathStepView["status"], string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "hecho",
  discarded: "quitado",
};

// Tope de la entrada escalonada: en una ruta larga, los últimos nodos no esperan más de ~0,6 s.
const ENTRANCE_STEP_MS = 60;
const MAX_ENTRANCE_DELAY_MS = 600;

type PathMapNodeProps = {
  step: PathStepView;
  // Número del paso dentro de toda la ruta (1..N sobre los vigentes), el mismo de la lista.
  stepNumber: number;
  totalSteps: number;
  position: NodePosition;
  // El próximo paso de la ruta (findNextStep, spec 09): lleva halo y globo. La mascota la dibuja
  // path-map.tsx, porque viaja de un nodo a otro.
  isNext: boolean;
  // Posición en el orden de aparición del mapa completo, para la entrada escalonada.
  entranceIndex: number;
  onOpen: (trigger: HTMLButtonElement) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
};

// Sin "use client" a propósito, mismo criterio que step-status-toggle.tsx: recibe callbacks y
// solo se importa desde path-map.tsx, que cuelga de path-steps-view.tsx (cliente).
export function PathMapNode({
  step,
  stepNumber,
  totalSteps,
  position,
  isNext,
  entranceIndex,
  onOpen,
  buttonRef,
}: PathMapNodeProps) {
  // El "pop" solo corre cuando el paso cambia a hecho durante la sesión, no al cargar un paso que
  // ya estaba hecho: se compara con el estado del render anterior (patrón de React "guardar
  // información de renders previos"), no con el del montaje.
  const [previousStatus, setPreviousStatus] = useState(step.status);
  const [shouldPop, setShouldPop] = useState(false);
  if (step.status !== previousStatus) {
    setPreviousStatus(step.status);
    setShouldPop(step.status === "done");
  }

  const isDone = step.status === "done";
  const isInProgress = step.status === "in_progress";
  const accessibleName = `Paso ${stepNumber} de ${totalSteps}: ${step.courseTitle}, ${STATUS_LABELS[step.status]}. Abrir detalle`;
  const bubbleText = isInProgress ? "Continuar" : "Empezar";

  const placement: CSSProperties = {
    left: position.x - LABEL_WIDTH / 2,
    top: position.y - NODE_SIZE / 2,
    width: LABEL_WIDTH,
    animationDelay: `${Math.min(entranceIndex * ENTRANCE_STEP_MS, MAX_ENTRANCE_DELAY_MS)}ms`,
  };
  // El halo y el globo "llegan" después de que el camino se rellenó y la mascota viajó.
  const arrivalDelay: CSSProperties = { animationDelay: `${ARRIVAL_DELAY_MS}ms` };

  return (
    <li
      className="absolute flex flex-col items-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 motion-safe:fill-mode-both"
      style={placement}
    >
      <div className="relative">
        {isNext ? (
          // Halo: un anillo fijo siempre, y el latido encima solo si se permite movimiento. La
          // entrada va en el envoltorio porque animate-ping ya ocupa la animación del hijo.
          <span
            aria-hidden="true"
            className="absolute -inset-2 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-300 motion-safe:fill-mode-both"
            style={arrivalDelay}
          >
            <span className="absolute inset-0 rounded-full bg-primary-bright/25 motion-safe:animate-ping" />
            <span className="absolute inset-0 rounded-full ring-4 ring-primary-bright/40" />
          </span>
        ) : null}

        <button
          type="button"
          ref={buttonRef}
          aria-label={accessibleName}
          onClick={(event) => onOpen(event.currentTarget)}
          className={cn(
            "relative flex size-16 items-center justify-center rounded-full border-2 font-heading text-xl font-bold tabular-nums shadow-md transition-[transform,box-shadow] duration-150 outline-none hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/60 active:scale-95",
            isDone && "border-primary-bright bg-primary-bright text-primary-bright-foreground",
            isInProgress && "border-primary bg-primary text-primary-foreground shadow-brand-glow",
            !isDone && !isInProgress && "border-border bg-card text-muted-foreground",
            shouldPop && "motion-safe:animate-step-pop",
          )}
        >
          {isNext ? (
            // Dentro del botón: tocar el globo es tocar el nodo, sin una segunda parada de Tab. Dos
            // capas: la de afuera centra con translate y la de adentro anima su entrada, porque la
            // animación también usa transform y pisaría el centrado.
            <span
              aria-hidden="true"
              className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2"
            >
              <span
                className="relative block rounded-full bg-primary-bright px-3 py-1 font-heading text-xs font-bold tracking-wide whitespace-nowrap text-primary-bright-foreground uppercase shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both"
                style={arrivalDelay}
              >
                {bubbleText}
                <span className="absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-primary-bright" />
              </span>
            </span>
          ) : null}

          {isDone ? <CheckIcon weight="bold" aria-hidden="true" className="size-7" /> : stepNumber}
        </button>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "mt-2 line-clamp-2 rounded-md bg-background/85 px-1.5 text-center text-xs leading-snug font-medium text-balance",
          isDone ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {step.courseTitle}
      </span>
    </li>
  );
}
