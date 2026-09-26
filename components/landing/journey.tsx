"use client";

import Image from "next/image";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { stepNodeClassName } from "@/components/paths/step-node-style";
import { railFillRatio, stationState, type StationState } from "@/lib/landing/journey-state";
import { TRAVEL_DURATION_MS } from "@/lib/path-map/motion";
import type { PathStepStatus } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import { MASCOT_POSES, type MascotPoseId } from "./mascot-poses";

export type JourneyStation = {
  id: string;
  title: string;
  description: string;
  // Ya renderizado: un componente (una función) no cruza de un Server Component a uno cliente.
  icon: ReactNode;
  pose: MascotPoseId;
  mockup: ReactNode;
};

// El nodo de cada estación se ve como un paso del mapa del spec 12.
const NODE_STATUS_BY_STATE: Record<StationState, PathStepStatus> = {
  visited: "done",
  current: "in_progress",
  upcoming: "pending",
};

// En px: el nodo es size-14 y el astronauta, size-12 en móvil y size-16 en desktop.
const NODE_SIZE = 56;
const MASCOT_SIZE_MOBILE = 48;
const MASCOT_SIZE_DESKTOP = 64;
const MASCOT_GAP = 12;

// Una línea en el centro de la ventana: la estación que la cruza es la actual.
const CENTER_LINE_MARGIN = "-50% 0px -50% 0px";

function mediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    getSnapshot: () => window.matchMedia(query).matches,
  };
}

const reducedMotionStore = mediaQueryStore("(prefers-reduced-motion: reduce)");
// El breakpoint lg de Tailwind: ahí el riel pasa al centro.
const desktopStore = mediaQueryStore("(min-width: 64rem)");

// En el servidor y en la hidratación no se anima: el HTML inicial es el estado final (sin JS se ve
// completo), y los estados "antes de llegar" recién aparecen en el cliente.
function useCanAnimate(): boolean {
  const prefersReducedMotion = useSyncExternalStore(
    reducedMotionStore.subscribe,
    reducedMotionStore.getSnapshot,
    () => true,
  );

  return !prefersReducedMotion;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(desktopStore.subscribe, desktopStore.getSnapshot, () => false);
}

type JourneyStationContextValue = { isRevealed: boolean };

// Para los mockups que necesitan JS para animarse (la XpBar): true cuando ya se ven terminados.
const JourneyStationContext = createContext<JourneyStationContextValue>({ isRevealed: true });

export function useJourneyStation(): JourneyStationContextValue {
  return useContext(JourneyStationContext);
}

type Point = { x: number; y: number };

function mascotPosition(nodeCenter: Point, stationIndex: number, isDesktop: boolean): Point {
  if (!isDesktop) {
    return {
      x: nodeCenter.x - MASCOT_SIZE_MOBILE / 2,
      y: nodeCenter.y - MASCOT_SIZE_MOBILE / 2,
    };
  }

  // En desktop va al costado del nodo, del lado de la pose de esa estación.
  const isPoseOnRight = stationIndex % 2 === 0;
  const nodeEdgeOffset = NODE_SIZE / 2 + MASCOT_GAP;
  const x = isPoseOnRight
    ? nodeCenter.x + nodeEdgeOffset
    : nodeCenter.x - nodeEdgeOffset - MASCOT_SIZE_DESKTOP;

  return { x, y: nodeCenter.y - MASCOT_SIZE_DESKTOP / 2 };
}

export function Journey({ stations }: { stations: JourneyStation[] }) {
  const canAnimate = useCanAnimate();
  const isDesktop = useIsDesktop();

  const listRef = useRef<HTMLOListElement>(null);
  const stationRefs = useRef<(HTMLLIElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reachedIndexes, setReachedIndexes] = useState<ReadonlySet<number>>(() => new Set());
  const [nodeCenters, setNodeCenters] = useState<Point[]>([]);

  // Los centros de los nodos se miden del DOM y se vuelven a medir cuando cambia el alto de la
  // lista (ancho de la ventana, imágenes que terminan de cargar, rotación del celular).
  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    function measureNodeCenters(listElement: HTMLOListElement) {
      const listRect = listElement.getBoundingClientRect();
      const centers = nodeRefs.current.map((node) => {
        const nodeRect = node?.getBoundingClientRect();
        if (!nodeRect) {
          return { x: 0, y: 0 };
        }

        return {
          x: nodeRect.left - listRect.left + nodeRect.width / 2,
          y: nodeRect.top - listRect.top + nodeRect.height / 2,
        };
      });
      setNodeCenters(centers);
    }

    const resizeObserver = new ResizeObserver(() => measureNodeCenters(list));
    resizeObserver.observe(list);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    function arriveAt(stationIndex: number) {
      setCurrentIndex(stationIndex);
      setReachedIndexes((previous) => {
        if (previous.has(stationIndex)) {
          return previous;
        }

        return new Set(previous).add(stationIndex);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            arriveAt(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { rootMargin: CENTER_LINE_MARGIN },
    );

    for (const station of stationRefs.current) {
      if (station) {
        observer.observe(station);
      }
    }

    // El observer no avisa si una estación salta de abajo a arriba de la línea sin cruzarla (un
    // salto de ancla, un scroll brusco). Al terminar, se aplica la misma regla midiendo: la actual
    // es la última estación que ya pasó el centro de la ventana.
    function syncWithCenterLine() {
      const centerLine = window.innerHeight / 2;
      let lastPassedIndex: number | null = null;

      stationRefs.current.forEach((station, index) => {
        if (station && station.getBoundingClientRect().top <= centerLine) {
          lastPassedIndex = index;
        }
      });

      if (lastPassedIndex !== null) {
        arriveAt(lastPassedIndex);
      }
    }

    window.addEventListener("hashchange", syncWithCenterLine);
    window.addEventListener("scrollend", syncWithCenterLine);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", syncWithCenterLine);
      window.removeEventListener("scrollend", syncWithCenterLine);
    };
  }, [stations.length]);

  const hasMeasured = nodeCenters.length === stations.length && stations.length > 0;
  const firstNodeCenter = nodeCenters[0];
  const lastNodeCenter = nodeCenters[nodeCenters.length - 1];
  const fillRatio = railFillRatio(
    nodeCenters.map((center) => center.y),
    currentIndex,
  );
  const mascotSize = isDesktop ? MASCOT_SIZE_DESKTOP : MASCOT_SIZE_MOBILE;
  const travelDuration = `${TRAVEL_DURATION_MS}ms`;

  return (
    <ol ref={listRef} data-journey-ready={canAnimate ? "" : undefined} className="relative">
      {hasMeasured ? (
        <>
          {/* El riel: punteado de fondo y, encima, el tramo recorrido hasta la estación actual. */}
          <div
            aria-hidden="true"
            className="absolute -translate-x-1/2 border-l-4 border-dotted border-border"
            style={{
              left: firstNodeCenter.x,
              top: firstNodeCenter.y,
              height: lastNodeCenter.y - firstNodeCenter.y,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute w-1.5 origin-top -translate-x-1/2 rounded-full bg-primary-bright motion-safe:transition-transform motion-safe:ease-in-out"
            style={{
              left: firstNodeCenter.x,
              top: firstNodeCenter.y,
              height: lastNodeCenter.y - firstNodeCenter.y,
              transform: `scaleY(${fillRatio})`,
              transitionDuration: travelDuration,
            }}
          />
          <JourneyMascot
            position={mascotPosition(nodeCenters[currentIndex], currentIndex, isDesktop)}
            size={mascotSize}
          />
        </>
      ) : null}

      {stations.map((station, index) => {
        const state = stationState(index, currentIndex);
        const isReached = reachedIndexes.has(index);
        const isPoseOnRight = index % 2 === 0;
        const pose = MASCOT_POSES[station.pose];

        return (
          <li
            key={station.id}
            ref={(element) => {
              stationRefs.current[index] = element;
            }}
            data-index={index}
            data-state={state}
            // Solo existe con JS y movimiento permitido: sin él, nada arranca oculto.
            data-reached={canAnimate ? String(isReached) : undefined}
            // La pose y el mockup aparecen cuando el astronauta ya llegó.
            style={{ "--arrival-delay": travelDuration } as CSSProperties}
            // En móvil: nodo, título y pose en la primera fila; descripción y mockup a todo el ancho
            // debajo. En desktop: texto y mockup de un lado del riel y la pose del otro.
            className="group/station grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] gap-x-4 gap-y-3 pb-16 last:pb-0 lg:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] lg:gap-x-10 lg:pb-28"
          >
            <JourneyStationContext value={{ isRevealed: !canAnimate || isReached }}>
              <div className="col-start-1 row-start-1 flex items-center justify-center lg:col-start-2 lg:row-span-3">
                <span
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 flex size-14 items-center justify-center rounded-full border-4 transition-colors duration-300 [&_svg]:size-6",
                    stepNodeClassName(NODE_STATUS_BY_STATE[state]),
                    state === "current" && "motion-safe:animate-step-pop",
                  )}
                >
                  {station.icon}
                </span>
              </div>

              <div
                className={cn(
                  "col-start-2 row-start-1 flex flex-col gap-2 self-center lg:self-end",
                  isPoseOnRight ? "lg:col-start-1" : "lg:col-start-3",
                )}
              >
                <Eyebrow>Paso {index + 1}</Eyebrow>
                <h3 className="text-xl font-semibold text-balance sm:text-2xl">{station.title}</h3>
              </div>

              <p
                className={cn(
                  "col-span-2 col-start-2 row-start-2 text-pretty text-muted-foreground lg:col-span-1",
                  isPoseOnRight ? "lg:col-start-1" : "lg:col-start-3",
                )}
              >
                {station.description}
              </p>

              {/* Flota con el puntero encima. En el contenedor y no en la imagen, para no pisar
                  la transición con la que aparece al llegar. */}
              <div
                className={cn(
                  "col-start-3 row-start-1 self-center motion-safe:hover:animate-float",
                  "lg:row-span-3 lg:justify-self-center",
                  isPoseOnRight ? "lg:col-start-3" : "lg:col-start-1",
                )}
              >
                {/* Decorativa: el título de la estación ya dice de qué se trata. */}
                <Image
                  src={pose.src}
                  width={pose.width}
                  height={pose.height}
                  alt=""
                  sizes="(min-width: 64rem) 224px, 80px"
                  className="h-auto w-20 drop-shadow-xl transition delay-(--arrival-delay) duration-700 ease-out group-data-[reached=false]/station:translate-y-6 group-data-[reached=false]/station:opacity-0 lg:w-56"
                />
              </div>

              <div
                className={cn(
                  "col-span-2 col-start-2 row-start-3 mt-2 lg:col-span-1",
                  isPoseOnRight ? "lg:col-start-1" : "lg:col-start-3",
                  "transition delay-(--arrival-delay) duration-500 group-data-[reached=false]/station:translate-y-4 group-data-[reached=false]/station:opacity-0",
                )}
              >
                {station.mockup}
              </div>
            </JourneyStationContext>
          </li>
        );
      })}
    </ol>
  );
}

// El mismo astronauta que viaja por el mapa del spec 12, con la misma duración.
function JourneyMascot({ position, size }: { position: Point; size: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-20 motion-safe:transition-transform motion-safe:ease-in-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transitionDuration: `${TRAVEL_DURATION_MS}ms`,
      }}
    >
      <Image
        src="/astronauta.webp"
        alt=""
        width={size}
        height={size}
        className="max-w-none drop-shadow-lg"
      />
    </div>
  );
}
