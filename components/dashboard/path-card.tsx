import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";

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
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { NextStep } from "@/lib/progress/next-step";
import { formatHours, type PathProgress } from "@/lib/progress/path-progress";

export type DashboardPath = {
  id: string;
  title: string;
  createdAt: string;
  progress: PathProgress;
  nextStep: NextStep | null;
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

function getActionLabel(path: DashboardPath): string {
  if (path.nextStep === null) {
    return "Ver ruta";
  }

  // Un paso in_progress siempre gana en findNextStep, así que si hay alguno lo trae nextStep.
  const hasStarted = path.progress.doneCount > 0 || path.nextStep.status === "in_progress";
  if (hasStarted) {
    return "Continuar";
  }

  return "Empezar";
}

export function PathCard({ path }: PathCardProps) {
  const { progress, nextStep } = path;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-balance">{path.title}</CardTitle>
        <CardDescription>Creada el {formatCreatedAt(path.createdAt)}</CardDescription>
        <CardAction>
          <DeletePathButton pathId={path.id} pathTitle={path.title} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Progress value={progress.percentDone}>
            <ProgressLabel>Avance</ProgressLabel>
            <ProgressValue />
          </Progress>
          <p className="text-xs text-muted-foreground">
            {progress.doneCount} de {progress.activeCount} cursos hechos ·{" "}
            {formatHours(progress.doneHours)} de {formatHours(progress.activeHours)}
          </p>
        </div>

        {nextStep ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Próximo curso</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {nextStep.status === "in_progress" ? "En curso" : "Pendiente"}
              </Badge>
              <span className="font-medium">{nextStep.courseTitle}</span>
            </div>
          </div>
        ) : (
          <Badge>
            <CheckCircleIcon data-icon="inline-start" />
            Ruta completada
          </Badge>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" render={<Link href={`/paths/${path.id}`} />} nativeButton={false}>
          {getActionLabel(path)}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
