"use client";

import { type Control, useController } from "react-hook-form";

import { MAX_FREE_TEXT_LENGTH, type AssessmentAnswers } from "@/components/quiz/quiz-schema";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function FreeTextStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field, fieldState } = useController({ control, name: "freeText" });

  return (
    <FieldSet>
      <FieldLegend>Cuéntanos más sobre tu meta (opcional)</FieldLegend>
      <FieldGroup>
        <Field data-invalid={!!fieldState.error}>
          <Textarea
            placeholder="Ej: sé HTML y CSS pero nunca toqué backend, busco un trabajo remoto."
            maxLength={MAX_FREE_TEXT_LENGTH}
            aria-invalid={!!fieldState.error}
            {...field}
          />
          <FieldDescription>
            {field.value.length}/{MAX_FREE_TEXT_LENGTH} caracteres. Si la personalización con IA
            está disponible, ajustamos tu ruta según lo que cuentes (y te mostramos qué cambiamos) y
            explicamos cada curso pensando en ti. Los cursos siempre salen de las rutas oficiales de
            DevTalles.
          </FieldDescription>
          <FieldError errors={[fieldState.error]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
