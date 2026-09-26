import { Eyebrow } from "@/components/brand/eyebrow";
import { formatHours, type PathProgress } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import type { PathStepGroup } from "./path-step";

type StepGroupHeadingProps = {
  group: PathStepGroup;
  progress: PathProgress;
  // false en la ruta compartida: cuenta cursos en vez de mostrar el avance del autor (spec 15).
  showDoneCount?: boolean;
  className?: string;
};

function countLabel(progress: PathProgress, showDoneCount: boolean): string {
  if (showDoneCount) {
    return `${progress.doneCount} de ${progress.activeCount} hechos`;
  }

  return progress.activeCount === 1 ? "1 curso" : `${progress.activeCount} cursos`;
}

// El encabezado de un programa, igual en la lista y en el mapa.
export function StepGroupHeading({
  group,
  progress,
  showDoneCount = true,
  className,
}: StepGroupHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="flex flex-col gap-1">
        <Eyebrow>{group.isInterestGroup ? "Extra" : "Programa oficial"}</Eyebrow>
        <h2 className="font-heading text-xl font-semibold text-balance">{group.title}</h2>
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {countLabel(progress, showDoneCount)} · {formatHours(progress.activeHours)}
      </span>
    </div>
  );
}
