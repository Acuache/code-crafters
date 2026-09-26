import type { PathStepStatus } from "@/lib/progress/path-progress";

// Colores del círculo de un paso según su estado. Los usan la lista y el mapa, que deben verse
// iguales.
export function stepNodeClassName(status: PathStepStatus): string {
  if (status === "done") {
    return "border-primary-bright bg-primary-bright text-primary-bright-foreground";
  }

  if (status === "in_progress") {
    return "border-primary bg-primary text-primary-foreground shadow-brand-glow";
  }

  return "border-border bg-card text-muted-foreground";
}
