import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PathStepView } from "@/lib/paths/path-view";

export function BonusMissions({ steps, onSelect }: { steps: PathStepView[]; onSelect(step: PathStepView): void }) {
  if (!steps.length) return null;
  return <Card><CardHeader><CardTitle>Misiones bonus</CardTitle></CardHeader><CardContent>{steps.map((step) => <Button key={step.id} variant="ghost" onClick={() => onSelect(step)}>{step.course.title}</Button>)}</CardContent></Card>;
}
