import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
};

// Archivo propio porque el panel de detalle del mapa (spec 12) reusa este mismo control. Sin
// "use client" a propósito: recibe un callback, así que sólo se importa desde componentes cliente
// (path-steps-view.tsx) y hereda ese límite en vez de declarar uno propio.
export function StepStatusToggle({ value, onValueChange, courseTitle }: StepStatusToggleProps) {
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
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={handleValueChange}
      aria-label={`Estado de ${courseTitle}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
