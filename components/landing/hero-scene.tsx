import { FlagCheckeredIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EXAMPLE_COURSES, EXAMPLE_DISCARDED, type ExampleCourse } from "@/lib/landing/example-path";
import { formatHours } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import { HeroAstronaut } from "./hero-astronaut";

// La escena se diseña sobre un lienzo de 600 × 600: el SVG escala solo y el resto se ubica en %.
const SCENE_SIZE = 600;

// Sube desde abajo a la derecha hasta los propulsores del astronauta, pasando por cada planeta.
const TRAIL_PATH =
  "M 596 596 C 560 590 520 548 480 520 S 400 480 352 452 S 300 368 286 322 S 230 262 196 226";

type ScenePoint = { x: number; y: number };

type Planet = ScenePoint & { labelSide: "left" | "right"; delayMs: number };

// Uno por curso de EXAMPLE_COURSES, en el mismo orden. Aparecen a medida que la estela los alcanza.
const PLANETS: Planet[] = [
  { x: 480, y: 520, labelSide: "left", delayMs: 500 },
  { x: 352, y: 452, labelSide: "left", delayMs: 900 },
  { x: 286, y: 322, labelSide: "right", delayMs: 1300 },
];

// Fuera de la estela: el curso que la ruta se salta.
const DISCARDED_PLANETS: ScenePoint[] = [{ x: 190, y: 528 }];

// Ubicado para que las llamas de los propulsores caigan justo donde termina la estela.
const ASTRONAUT_BOX = { x: -34, y: -42, size: 320 };

const SATURN = { x: 516, y: 112, r: 38, ringRx: 82, ringRy: 17, tiltDeg: -20 };

// Decorativos y tenues, en los huecos que dejan la estela y las etiquetas.
const SMALL_PLANETS = [
  { x: 446, y: 186, r: 5, color: "var(--chart-2)" },
  { x: 380, y: 30, r: 7, color: "var(--chart-2)" },
  { x: 566, y: 318, r: 11, color: "var(--chart-3)" },
  { x: 64, y: 470, r: 16, color: "var(--chart-5)" },
];

function toScenePercent(value: number): string {
  return `${(value / SCENE_SIZE) * 100}%`;
}

function placeAt(point: ScenePoint): CSSProperties {
  return { left: toScenePercent(point.x), top: toScenePercent(point.y) };
}

export function HeroScene() {
  return (
    <div
      role="group"
      aria-label="Ruta de ejemplo"
      className="relative mx-auto aspect-square w-full max-w-76 sm:max-w-md lg:max-w-none"
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${SCENE_SIZE} ${SCENE_SIZE}`}
        className="absolute inset-0 size-full overflow-visible"
        fill="none"
        strokeLinecap="round"
      >
        <defs>
          <linearGradient id="hero-trail-gradient" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor="var(--primary-bright)" />
          </linearGradient>
          <filter id="hero-trail-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <DecorativePlanets />

        <path d={TRAIL_PATH} stroke="var(--border)" strokeWidth={4} strokeDasharray="0.1 14" />
        <path
          d={TRAIL_PATH}
          pathLength={1}
          strokeDasharray="1 1"
          stroke="url(#hero-trail-gradient)"
          strokeWidth={18}
          opacity={0.5}
          filter="url(#hero-trail-glow)"
          className="hero-trail-draw"
        />
        <path
          d={TRAIL_PATH}
          pathLength={1}
          strokeDasharray="1 1"
          stroke="url(#hero-trail-gradient)"
          strokeWidth={6}
          className="hero-trail-draw"
        />

        <TrailSpark />
      </svg>

      {EXAMPLE_COURSES.map((course, index) => (
        <CoursePlanet
          key={course.slug}
          course={course}
          planet={PLANETS[index]}
          stepNumber={index + 1}
          isGoal={index === EXAMPLE_COURSES.length - 1}
        />
      ))}

      {EXAMPLE_DISCARDED.map((course, index) => (
        <div
          key={course.slug}
          className="absolute hidden -translate-x-1/2 -translate-y-1/2 sm:block"
          style={placeAt(DISCARDED_PLANETS[index])}
        >
          <div
            className="motion-safe:animate-in motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:fade-in"
            style={{ animationDelay: "1600ms" }}
          >
            <Tooltip>
              <TooltipTrigger
                aria-label={`${course.title}: quitado, ${course.discardReason}`}
                className="relative flex size-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ProhibitIcon aria-hidden="true" className="size-4" />
                <span className="absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded-full border border-dashed bg-card/70 px-3 py-1 text-xs whitespace-nowrap backdrop-blur">
                  <s>{course.shortTitle}</s> · {course.discardReason}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <CourseTooltipText
                  title={course.title}
                  detail={`Quitado: ${course.discardReason}`}
                />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}

      <div
        className="absolute"
        style={{
          ...placeAt(ASTRONAUT_BOX),
          width: toScenePercent(ASTRONAUT_BOX.size),
          height: toScenePercent(ASTRONAUT_BOX.size),
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[15%] rounded-full bg-primary/30 blur-3xl"
        />
        <div
          className="size-full motion-safe:animate-in motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-10 motion-safe:slide-in-from-right-10 motion-safe:fade-in"
          style={{ animationDelay: "1100ms" }}
        >
          <div className="mascot-flight-motion size-full">
            <HeroAstronaut />
          </div>
        </div>
      </div>
    </div>
  );
}

type CoursePlanetProps = {
  course: ExampleCourse;
  planet: Planet;
  stepNumber: number;
  isGoal: boolean;
};

function CoursePlanet({ course, planet, stepNumber, isGoal }: CoursePlanetProps) {
  const hours = formatHours(course.hours);
  const accessibleName = `Paso ${stepNumber}${isGoal ? ", la llegada" : ""}: ${course.title}, ${hours}. ${course.engineReason}`;

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={placeAt(planet)}>
      <div
        className="motion-safe:animate-in motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:zoom-in-50 motion-safe:fade-in"
        style={{ animationDelay: `${planet.delayMs}ms` }}
      >
        <Tooltip>
          <TooltipTrigger
            aria-label={accessibleName}
            className={cn(
              "relative flex items-center justify-center rounded-full font-heading font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isGoal
                ? "size-12 bg-linear-[135deg] from-primary to-primary-end text-primary-foreground shadow-brand-glow ring-4 ring-primary-bright/30 sm:size-16"
                : "size-9 border-2 border-primary-bright/70 bg-card text-sm shadow-md sm:size-11 sm:text-base",
            )}
          >
            {isGoal ? (
              <FlagCheckeredIcon weight="bold" aria-hidden="true" className="size-5 sm:size-7" />
            ) : (
              stepNumber
            )}
            {/* Dentro del disparador: pasar el mouse por la etiqueta también abre el detalle. */}
            <span
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full border bg-card/85 px-3 py-1 font-sans text-xs font-normal whitespace-nowrap text-foreground shadow-sm backdrop-blur sm:text-sm",
                planet.labelSide === "left" ? "right-full mr-2 sm:mr-3" : "left-full ml-2 sm:ml-3",
              )}
            >
              <span className="font-semibold">{course.shortTitle}</span>
              <span className="text-muted-foreground">{hours}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <CourseTooltipText title={course.title} detail={course.engineReason} />
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function CourseTooltipText({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-medium">{title}</span>
      <span className="opacity-80">{detail}</span>
    </span>
  );
}

// Un punto de luz recorre la estela cada tanto. El id va sin guiones: SMIL lee "-" como una resta.
function TrailSpark() {
  return (
    <g opacity={0} className="motion-reduce:hidden">
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.15;0.8;1"
        dur="2.6s"
        begin="heroSparkMotion.begin"
      />
      <animateMotion
        id="heroSparkMotion"
        path={TRAIL_PATH}
        dur="2.6s"
        begin="3s;heroSparkMotion.end+4s"
        calcMode="spline"
        keyPoints="0;1"
        keyTimes="0;1"
        keySplines="0.4 0 0.2 1"
      />
      {/* Degradado y no el blur de la estela, que en un círculo tan chico se recorta en cuadrado. */}
      <defs>
        <radialGradient id="hero-spark-glow">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.9} />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={16} fill="url(#hero-spark-glow)" />
      <circle r={4} fill="var(--primary-foreground)" />
    </g>
  );
}

// Un Saturno con volumen (la mitad trasera del anillo pasa detrás del planeta) y planetas chicos.
function DecorativePlanets() {
  const ringLeft = SATURN.x - SATURN.ringRx;
  const ringRight = SATURN.x + SATURN.ringRx;
  const ringArc = `M ${ringLeft} ${SATURN.y} A ${SATURN.ringRx} ${SATURN.ringRy} 0 0`;
  const backRingPath = `${ringArc} 1 ${ringRight} ${SATURN.y}`;
  const frontRingPath = `${ringArc} 0 ${ringRight} ${SATURN.y}`;

  return (
    <g opacity={0.8}>
      <defs>
        <radialGradient id="hero-saturn-gradient" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.85} />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.55} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.15} />
        </radialGradient>
        <linearGradient id="hero-ring-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.15} />
          <stop offset="50%" stopColor="var(--primary-bright)" stopOpacity={0.8} />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.15} />
        </linearGradient>
        <clipPath id="hero-saturn-clip">
          <circle cx={SATURN.x} cy={SATURN.y} r={SATURN.r} />
        </clipPath>
        {SMALL_PLANETS.map((planet, index) => (
          <radialGradient key={index} id={`hero-small-planet-${index}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor={planet.color} stopOpacity={0.8} />
            <stop offset="100%" stopColor={planet.color} stopOpacity={0.1} />
          </radialGradient>
        ))}
      </defs>

      <g transform={`rotate(${SATURN.tiltDeg} ${SATURN.x} ${SATURN.y})`}>
        <path d={backRingPath} stroke="url(#hero-ring-gradient)" strokeWidth={7} opacity={0.45} />
        <circle cx={SATURN.x} cy={SATURN.y} r={SATURN.r} fill="url(#hero-saturn-gradient)" />
        <g clipPath="url(#hero-saturn-clip)">
          <ellipse
            cx={SATURN.x}
            cy={SATURN.y - 12}
            rx={60}
            ry={4}
            fill="var(--chart-2)"
            opacity={0.2}
          />
          <ellipse
            cx={SATURN.x}
            cy={SATURN.y + 10}
            rx={60}
            ry={6}
            fill="var(--primary)"
            opacity={0.3}
          />
        </g>
        <path d={frontRingPath} stroke="url(#hero-ring-gradient)" strokeWidth={7} opacity={0.75} />
        <path d={frontRingPath} stroke="var(--chart-2)" strokeWidth={1.5} opacity={0.5} />
      </g>

      {SMALL_PLANETS.map((planet, index) => (
        <circle
          key={index}
          cx={planet.x}
          cy={planet.y}
          r={planet.r}
          fill={`url(#hero-small-planet-${index})`}
        />
      ))}
    </g>
  );
}
