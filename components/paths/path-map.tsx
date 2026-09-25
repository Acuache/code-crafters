import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { FOLLOW_DELAY_MS, TRAVEL_DURATION_MS } from "@/lib/path-map/motion";
import {
  buildSegmentPath,
  computeNodePositions,
  NODE_SIZE,
  TRACK_WIDTH,
  trackHeight,
  type NodePosition,
} from "@/lib/path-map/zigzag-layout";
import { findNextStep } from "@/lib/progress/next-step";

import { PathMapNode } from "./path-map-node";
import { summarizeStepsProgress, type PathStepGroup, type PathStepView } from "./path-step";
import { StepGroupHeading } from "./step-group-heading";

type PathMapProps = {
  // Los mismos grupos que la lista, para que las dos vistas cuenten lo mismo.
  groups: PathStepGroup[];
  stepNumbers: Map<string, number>;
  totalSteps: number;
  // Sin él, el mapa es de solo lectura (ruta compartida, spec 15): sin próximo paso ni avance.
  onOpenStep?: (stepId: string, trigger: HTMLButtonElement) => void;
};

// Sin "use client" a propósito: recibe callbacks y solo se importa desde componentes cliente.
export function PathMap({ groups, stepNumbers, totalSteps, onOpenStep }: PathMapProps) {
  const nodeButtons = useRef(new Map<string, HTMLButtonElement>());
  const isReadOnly = onOpenStep === undefined;

  // El mismo próximo paso que muestra el dashboard para esta ruta.
  const activeSteps = groups.flatMap((group) => group.steps);
  const nextStep = isReadOnly ? null : findNextStep(activeSteps);
  const nextStepId = nextStep?.id ?? null;

  // Cuando cambia el próximo paso, la página acompaña a la mascota hasta el nuevo. Se compara con
  // el render anterior y no con un ref mutado en el efecto: en Strict Mode el efecto corre dos
  // veces y el ref ya actualizado cancelaría el segundo scroll.
  const [followedStepId, setFollowedStepId] = useState(nextStepId);
  const [stepToFollow, setStepToFollow] = useState<string | null>(null);
  if (nextStepId !== followedStepId) {
    setFollowedStepId(nextStepId);
    setStepToFollow(nextStepId);
  }

  // Al montar: llevar al usuario a donde se quedó, sin esperar.
  useEffect(() => {
    if (nextStepId) {
      scrollIntoCenter(nodeButtons.current.get(nextStepId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar; lo que sigue lo hace el efecto de abajo
  }, []);

  useEffect(() => {
    if (!stepToFollow) {
      return;
    }

    const delay = prefersReducedMotion() ? 0 : FOLLOW_DELAY_MS;
    const timeout = window.setTimeout(
      () => scrollIntoCenter(nodeButtons.current.get(stepToFollow)),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [stepToFollow]);

  function registerNodeButton(stepId: string, element: HTMLButtonElement | null) {
    if (element) {
      nodeButtons.current.set(stepId, element);
    } else {
      nodeButtons.current.delete(stepId);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const firstStepNumber = stepNumbers.get(group.steps[0]?.id ?? "") ?? 1;
        const positions = computeNodePositions(group.steps.length, firstStepNumber);
        const nextIndexInUnit = group.steps.findIndex((step) => step.id === nextStepId);

        return (
          <section key={group.key} className="flex flex-col gap-2">
            <UnitBanner group={group} showProgress={!isReadOnly} />

            <div
              className="relative mx-auto"
              style={{ width: TRACK_WIDTH, height: trackHeight(group.steps.length) }}
            >
              <UnitConnectors steps={group.steps} positions={positions} />
              {nextIndexInUnit >= 0 ? <Mascot nodePosition={positions[nextIndexInUnit]} /> : null}

              <ol className="relative size-full" aria-label={`Pasos de ${group.title}`}>
                {group.steps.map((step, index) => {
                  const stepNumber = stepNumbers.get(step.id) ?? 0;

                  return (
                    <PathMapNode
                      key={step.id}
                      step={step}
                      stepNumber={stepNumber}
                      totalSteps={totalSteps}
                      position={positions[index]}
                      isNext={step.id === nextStepId}
                      entranceIndex={stepNumber - 1}
                      onOpen={onOpenStep ? (trigger) => onOpenStep(step.id, trigger) : undefined}
                      buttonRef={(element) => registerNodeButton(step.id, element)}
                    />
                  );
                })}
              </ol>
            </div>
          </section>
        );
      })}
    </div>
  );
}

type UnitBannerProps = {
  group: PathStepGroup;
  showProgress: boolean;
};

function UnitBanner({ group, showProgress }: UnitBannerProps) {
  const groupProgress = summarizeStepsProgress(group.steps, null);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border brand-gradient-soft p-5 shadow-brand">
      <StepGroupHeading group={group} progress={groupProgress} showDoneCount={showProgress} />
      {showProgress ? (
        <Progress
          value={groupProgress.percentDone}
          aria-label={`Avance en ${group.title}: ${groupProgress.percentDone} %`}
        />
      ) : null}
    </div>
  );
}

type UnitConnectorsProps = {
  steps: PathStepView[];
  positions: NodePosition[];
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollIntoCenter(element: HTMLElement | undefined) {
  element?.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

const MASCOT_SIZE = 64;
const MASCOT_GAP = 16;

// Una sola mascota por unidad, que se mueve con transform en vez de montarse en cada nodo: así,
// al marcar un paso como hecho, viaja al siguiente a la par que el tramo se rellena. Dos capas: la
// de afuera se desplaza (transition) y la de adentro anima su entrada cuando la mascota llega a
// una unidad nueva, porque las dos usan transform y una pisaría a la otra.
function Mascot({ nodePosition }: { nodePosition: NodePosition }) {
  // Del lado contrario al desplazamiento del nodo, donde queda espacio libre en la pista.
  const isOnLeft = nodePosition.x > TRACK_WIDTH / 2;
  const nodeEdgeOffset = NODE_SIZE / 2 + MASCOT_GAP;
  const left = isOnLeft
    ? nodePosition.x - nodeEdgeOffset - MASCOT_SIZE
    : nodePosition.x + nodeEdgeOffset;
  const top = nodePosition.y - MASCOT_SIZE / 2;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 motion-safe:transition-transform motion-safe:ease-in-out"
      style={{
        transform: `translate(${left}px, ${top}px)`,
        transitionDuration: `${TRAVEL_DURATION_MS}ms`,
        transitionDelay: `${FOLLOW_DELAY_MS}ms`,
      }}
    >
      {/* Decorativa: el globo del próximo nodo ya dice qué es (CLAUDE.md §Marca). */}
      <Image
        src="/astronauta.webp"
        alt=""
        width={MASCOT_SIZE}
        height={MASCOT_SIZE}
        className="size-16 max-w-none drop-shadow-lg motion-safe:animate-in motion-safe:duration-300 motion-safe:fill-mode-both motion-safe:zoom-in-75 motion-safe:fade-in"
        style={{ animationDelay: `${FOLLOW_DELAY_MS}ms` }}
      />
    </div>
  );
}

// Un tramo por par de nodos consecutivos. El punteado va siempre debajo; encima, el tramo
// recorrido se "dibuja" animando stroke-dashoffset (pathLength=1 normaliza el largo de cada
// curva), así marcar un paso como hecho rellena su tramo en vez de cambiarlo de golpe.
function UnitConnectors({ steps, positions }: UnitConnectorsProps) {
  const segments = positions.slice(1).map((to, index) => ({
    key: steps[index].id,
    d: buildSegmentPath(positions[index], to),
    isTraversed: steps[index].status === "done",
  }));

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full overflow-visible"
      fill="none"
      strokeLinecap="round"
    >
      {segments.map((segment) => (
        <g key={segment.key}>
          <path d={segment.d} stroke="var(--border)" strokeWidth={4} strokeDasharray="0.1 12" />
          <path
            d={segment.d}
            pathLength={1}
            stroke="var(--primary-bright)"
            strokeWidth={6}
            strokeDasharray="1 1"
            strokeDashoffset={segment.isTraversed ? 0 : 1}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:ease-in-out"
            style={{
              transitionDuration: `${TRAVEL_DURATION_MS}ms`,
              transitionDelay: `${FOLLOW_DELAY_MS}ms`,
            }}
          />
        </g>
      ))}
    </svg>
  );
}
