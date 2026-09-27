import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@phosphor-icons/react/ssr";

import { DeletePathButton } from "@/components/dashboard/delete-path-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { formatHours, type PathProgress, type PathStepStatus } from "@/lib/progress/path-progress";

export type DashboardPath = {
  id: string;
  title: string;
  createdAt: string;
  progress: PathProgress;
  nextStep: { courseTitle: string; status: PathStepStatus } | null;
};

type PathCardProps = {
  path: DashboardPath;
};

// Locale fijo, mismo motivo que formatHours: el formato no debe depender del entorno.
function formatCreatedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isPathInProgress(path: DashboardPath): boolean {
  // Un paso in_progress siempre gana en findNextStep, así que si hay alguno lo trae nextStep.
  return (
    path.nextStep !== null &&
    (path.progress.doneCount > 0 || path.nextStep.status === "in_progress")
  );
}

function getActionLabel(path: DashboardPath): string {
  if (path.nextStep === null) {
    return "Ver ruta";
  }

  return isPathInProgress(path) ? "Continuar ruta" : "Empezar ruta";
}

export function PathCard({ path }: PathCardProps) {
  const { progress, nextStep } = path;
  const progressRingRadius = 34;
  const progressRingCircumference = 2 * Math.PI * progressRingRadius;
  const progressRingOffset = progressRingCircumference * (1 - progress.percentDone / 100);

  return (
    <Card className="h-full transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-balance">{path.title}</CardTitle>
        <CardDescription>Creada el {formatCreatedAt(path.createdAt)}</CardDescription>
        <CardAction>
          <DeletePathButton pathId={path.id} pathTitle={path.title} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-muted/30 p-3">
          <div
            aria-hidden="true"
            className="relative grid size-[4.5rem] shrink-0 place-items-center"
          >
            <svg
              viewBox="0 0 80 80"
              className="absolute inset-0 size-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r={progressRingRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-primary/20"
              />
              <circle
                cx="40"
                cy="40"
                r={progressRingRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={progressRingCircumference}
                strokeDashoffset={progressRingOffset}
                strokeLinecap="round"
                className="text-primary-bright transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
              />
            </svg>
            <span className="font-heading text-lg font-semibold tabular-nums">
              {progress.percentDone}%
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Progress value={progress.percentDone} aria-label="Avance de la ruta" className="gap-2">
              <ProgressLabel className="text-sm font-semibold text-foreground">
                Avance
              </ProgressLabel>
            </Progress>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BookOpenIcon aria-hidden="true" className="size-4 shrink-0" />
                {progress.doneCount} de {progress.activeCount} cursos hechos
              </span>
              <span className="hidden h-3.5 border-l border-border sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
                {formatHours(progress.doneHours)} de {formatHours(progress.activeHours)}
              </span>
            </div>
          </div>
        </div>

        {nextStep ? (
          <div className="flex min-h-24 flex-1 flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Próximo curso</span>
              <Badge variant="secondary">
                {nextStep.status === "in_progress" ? "En curso" : "Pendiente"}
              </Badge>
            </div>
            <span className="line-clamp-2 leading-snug font-medium text-pretty">
              {nextStep.courseTitle}
            </span>
          </div>
        ) : (
          <div className="flex min-h-24 flex-1 items-center rounded-xl border border-border/70 bg-muted/20 p-3">
            <Badge>
              <CheckCircleIcon data-icon="inline-start" />
              Ruta completada
            </Badge>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto pt-1">
        <Button
          className="w-full"
          render={<Link href={`/paths/${path.id}`} />}
          nativeButton={false}
        >
          {getActionLabel(path)}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
