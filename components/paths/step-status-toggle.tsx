import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type SelectableStepStatus = "pending" | "in_progress" | "done";

const STATUS_OPTIONS: { value: SelectableStepStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "done", label: "Hecho" },
];

type StepStatusToggleProps = {
  value: SelectableStepStatus;
  onValueChange: (status: SelectableStepStatus) => void;
  courseTitle: string;
  layout?: "joined" | "segmented";
};

// Archivo propio porque el panel de detalle del mapa (spec 12) reusa este mismo control. Sin
// "use client" a propósito: recibe un callback, así que sólo se importa desde componentes cliente
// (path-steps-view.tsx) y hereda ese límite en vez de declarar uno propio.
export function StepStatusToggle({
  value,
  onValueChange,
  courseTitle,
  layout = "joined",
}: StepStatusToggleProps) {
  const isSegmented = layout === "segmented";

  function handleValueChange(values: string[]) {
    // Base UI maneja `value` como string[] incluso en modo simple. Tocar el ítem ya activo manda
    // `[]`: se ignora, porque un paso siempre tiene exactamente un estado.
    const nextStatus = STATUS_OPTIONS.find((option) => option.value === values[0]);
    if (!nextStatus) {
      return;
    }

    onValueChange(nextStatus.value);
  }

  return (
    <ToggleGroup
      variant={isSegmented ? "default" : "outline"}
      size="sm"
      spacing={isSegmented ? 1 : 0}
      value={[value]}
      onValueChange={handleValueChange}
      aria-label={`Estado de ${courseTitle}`}
      className={
        isSegmented
          ? "max-w-full flex-nowrap rounded-full border border-primary/20 bg-primary/5 p-1"
          : undefined
      }
    >
      {STATUS_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          // El bg-muted de toggle.tsx casi no se ve en tema oscuro.
          className={cn(
            "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground",
            isSegmented &&
              "rounded-full px-2 text-muted-foreground hover:bg-primary/10 hover:text-foreground aria-pressed:bg-linear-[135deg] aria-pressed:from-primary aria-pressed:to-primary-end aria-pressed:text-primary-foreground aria-pressed:shadow-brand-glow aria-pressed:hover:brightness-110",
          )}
        >
          {isSegmented ? (
            <span
              aria-hidden="true"
              className={cn(
                "size-3 rounded-full border",
                value === option.value
                  ? "border-primary-foreground/70 bg-primary-foreground"
                  : "border-primary-bright/70",
              )}
            />
          ) : null}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
