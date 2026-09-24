import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PathStepView } from "@/lib/paths/path-view";

const labels = { done: "Completado", available: "Disponible", in_progress: "En progreso", locked: "Bloqueado", discarded: "Descartado" };
export function PathTimeline({ steps, selectedId, onSelect }: { steps: PathStepView[]; selectedId: string; onSelect(step: PathStepView): void }) {
  return <ol className="relative space-y-6 before:absolute before:inset-y-4 before:left-5 before:w-px before:bg-border">
    {steps.map((step, index) => <li key={step.id} className={index % 2 ? "relative xl:translate-x-8" : "relative"}>
      <Button variant={selectedId === step.id ? "default" : "outline"} className="h-auto w-full justify-between py-4 text-left" onClick={() => onSelect(step)} aria-label={`${step.course.title}: ${labels[step.uiStatus]}`}>
        <span><small className="block text-muted-foreground">Paso {index + 1}</small>{step.course.title}</span><Badge variant="outline">{labels[step.uiStatus]}</Badge>
      </Button>
    </li>)}
  </ol>;
}
