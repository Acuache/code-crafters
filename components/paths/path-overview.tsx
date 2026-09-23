import { FireIcon } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import type { PathView } from "@/lib/paths/path-view";

export function PathOverview({ path, streak }: { path: PathView; streak: { current: number; best: number } }) {
  return <Card><CardHeader><CardTitle>Tu misión</CardTitle></CardHeader><CardContent>
    <Progress value={path.progressPercentage}><ProgressLabel>{path.progressPercentage}% completado</ProgressLabel></Progress>
    <p>{path.mainSteps.length} cursos · {path.totalHours} horas</p>
    <p className="flex items-center gap-2 text-muted-foreground"><FireIcon /> {streak.current} días · récord {streak.best}</p>
  </CardContent></Card>;
}
