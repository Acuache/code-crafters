import { Eyebrow } from "@/components/brand/eyebrow";
import { formatHours, type PathProgress } from "@/lib/progress/path-progress";
import { cn } from "@/lib/utils";

import type { PathStepGroup } from "./path-step";

type StepGroupHeadingProps = {
  group: PathStepGroup;
  progress: PathProgress;
  className?: string;
};

// El encabezado de un programa, igual en la lista y en el mapa.
export function StepGroupHeading({ group, progress, className }: StepGroupHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="flex flex-col gap-1">
        <Eyebrow>{group.isInterestGroup ? "Extra" : "Programa oficial"}</Eyebrow>
        <h2 className="font-heading text-xl font-semibold text-balance">{group.title}</h2>
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {progress.doneCount} de {progress.activeCount} hechos · {formatHours(progress.activeHours)}
      </span>
    </div>
  );
}
