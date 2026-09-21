"use client";

import { type Control, useController } from "react-hook-form";

import type { AssessmentAnswers } from "@/components/quiz/quiz-schema";
import { Field, FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExperienceLevel } from "@/lib/paths/types";

const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "empiezo_de_cero", label: "Empiezo de cero" },
  { value: "tengo_bases", label: "Tengo bases" },
  { value: "intermedio", label: "Intermedio" },
];

export function LevelStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field, fieldState } = useController({ control, name: "level" });

  return (
    <FieldSet>
      <FieldLegend>¿Cómo describirías tu nivel hoy?</FieldLegend>
      <FieldGroup>
        <Field data-invalid={!!fieldState.error}>
          {/* Base UI ToggleGroup siempre maneja `value` como string[], incluso en modo simple
              (multiple=false por defecto): se adapta a un solo string en ambos sentidos. */}
          <ToggleGroup
            variant="outline"
            spacing={0}
            className="w-full"
            value={field.value ? [field.value] : []}
            onValueChange={(values) => field.onChange(values[0] ?? "")}
          >
            {LEVELS.map((level) => (
              <ToggleGroupItem key={level.value} value={level.value} className="flex-1">
                {level.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError errors={[fieldState.error]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
