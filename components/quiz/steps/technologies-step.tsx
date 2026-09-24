"use client";

import { type Control, useController } from "react-hook-form";

import type { AssessmentAnswers } from "@/components/quiz/quiz-schema";
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TECHNOLOGIES } from "@/lib/paths/interests";

export function TechnologiesStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field } = useController({ control, name: "masteredTechnologies" });

  return (
    <FieldSet>
      <FieldLegend>¿Qué tecnologías ya dominas?</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldDescription>
            Marca las que ya sabes usar — el motor no te vuelve a enseñar lo que ya dominas. Está
            bien si no marcas ninguna.
          </FieldDescription>
          <ToggleGroup
            multiple
            variant="outline"
            aria-label="Tecnologías que ya dominas"
            className="w-full flex-wrap"
            value={field.value}
            onValueChange={field.onChange}
          >
            {Object.entries(TECHNOLOGIES).map(([slug, technology]) => (
              <ToggleGroupItem key={slug} value={slug}>
                {technology.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
