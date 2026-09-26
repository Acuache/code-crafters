import type { ReactNode } from "react";
import { CheckCircleIcon, ClockIcon, TrendUpIcon, WarningIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { formatHours, type PathProgress } from "@/lib/progress/path-progress";

type BudgetCardProps = {
  progress: PathProgress;
  budgetHours: number | null;
};

type StatProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};

function Stat({ icon, label, value, detail }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary-bright">
        {icon}
        {label}
      </span>
      <span className="font-heading text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

export function BudgetCard({ progress, budgetHours }: BudgetCardProps) {
  const hoursDetail =
    budgetHours === null ? "sin tope de tiempo" : `de ${formatHours(budgetHours)} disponibles`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<ClockIcon />}
            label="Tu plan"
            value={formatHours(progress.activeHours)}
            detail={hoursDetail}
          />
          <Stat
            icon={<CheckCircleIcon />}
            label="Cursos hechos"
            value={`${progress.doneCount} de ${progress.activeCount}`}
            detail={`${formatHours(progress.doneHours)} completadas`}
          />
          <Stat
            icon={<TrendUpIcon />}
            label="Avance"
            value={`${progress.percentDone} %`}
            detail="medido en horas de estudio"
          />
        </div>

        <Progress value={progress.percentDone}>
          <ProgressLabel>Progreso de tu ruta</ProgressLabel>
          <ProgressValue />
        </Progress>

        {progress.fitsInBudget ? null : (
          <Alert>
            <WarningIcon />
            <AlertTitle>
              Tu ruta se pasa por {formatHours(progress.overflowHours)} de tu tiempo disponible
            </AlertTitle>
            <AlertDescription>
              Puedes quitar algún paso pendiente para que entre en tu plazo.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
