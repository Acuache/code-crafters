"use client";

import { useState } from "react";
import { type Control, type UseFormClearErrors, useController } from "react-hook-form";

import type { AssessmentAnswers } from "@/components/quiz/quiz-schema";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, GOALS } from "@/lib/paths/goals";
import type { Area } from "@/lib/paths/types";

const AREA_LABELS: Record<Area, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  movil: "Móvil",
  ia: "IA",
};

const AREA_ITEMS = AREAS.map((area) => ({ value: area, label: AREA_LABELS[area] }));

type GoalStepProps = {
  control: Control<AssessmentAnswers>;
  clearGoalError?: UseFormClearErrors<AssessmentAnswers>;
};

export function GoalStep({ control, clearGoalError }: GoalStepProps) {
  const { field, fieldState } = useController({ control, name: "goal" });
  const [area, setArea] = useState<Area | null>(
    () => (field.value ? (GOALS[field.value]?.area ?? null) : null),
  );
  const hasAreaError = !area && !!fieldState.error;

  // Cambiar de área limpia la meta elegida: una meta de otra área ya no es una opción válida.
  function handleAreaChange(nextArea: Area | null) {
    setArea(nextArea);
    field.onChange("");
    clearGoalError?.("goal");
  }

  const goalsInArea = area ? Object.entries(GOALS).filter(([, goal]) => goal.area === area) : [];
  const goalItems = goalsInArea.map(([slug, goal]) => ({ value: slug, label: goal.label }));

  return (
    <FieldSet>
      <FieldLegend>¿Qué quieres aprender?</FieldLegend>
      <FieldGroup>
        <Field data-invalid={hasAreaError}>
          <FieldLabel htmlFor="quiz-area">Área</FieldLabel>
          <Select items={AREA_ITEMS} value={area} onValueChange={handleAreaChange}>
            <SelectTrigger id="quiz-area" className="w-full" aria-invalid={hasAreaError}>
              <SelectValue placeholder="Elige un área" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {AREA_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {hasAreaError ? <FieldError>Elige un área para continuar.</FieldError> : null}
        </Field>
        <Field data-invalid={!!area && !!fieldState.error}>
          <FieldLabel htmlFor="quiz-goal">Meta</FieldLabel>
          <Select
            items={goalItems}
            value={field.value || null}
            onValueChange={(value) => {
              field.onChange(value ?? "");
              clearGoalError?.("goal");
            }}
            disabled={!area}
          >
            <SelectTrigger
              id="quiz-goal"
              className="w-full"
              aria-invalid={!!area && !!fieldState.error}
            >
              <SelectValue placeholder={area ? "Elige una meta" : "Elige un área primero"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {goalItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {area ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
