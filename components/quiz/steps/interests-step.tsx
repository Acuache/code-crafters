"use client";

import { type Control, useController } from "react-hook-form";

import type { AssessmentAnswers } from "@/components/quiz/quiz-schema";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INTERESTS } from "@/lib/paths/interests";

export function InterestsStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field } = useController({ control, name: "interests" });

  return (
    <FieldSet>
      <FieldLegend>¿Qué te interesa sumar a tu ruta?</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldDescription>
            Son temas transversales que se agregan a tu ruta si entran en tu tiempo disponible.
            Está bien si no marcás ninguno.
          </FieldDescription>
          <ToggleGroup
            multiple
            variant="outline"
            aria-label="Intereses para sumar a tu ruta"
            className="w-full flex-wrap"
            value={field.value}
            onValueChange={field.onChange}
          >
            {Object.entries(INTERESTS).map(([slug, interest]) => (
              <ToggleGroupItem key={slug} value={slug}>
                {interest.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
