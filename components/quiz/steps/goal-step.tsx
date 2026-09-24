"use client";

import { useState } from "react";
import { type Control, useController } from "react-hook-form";

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

export function GoalStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field, fieldState } = useController({ control, name: "goal" });
  const [area, setArea] = useState<Area | null>(null);

  // Cambiar de área limpia la meta elegida: una meta de otra área ya no es una opción válida.
  function handleAreaChange(nextArea: Area | null) {
    setArea(nextArea);
    field.onChange("");
  }

  const goalsInArea = area ? Object.entries(GOALS).filter(([, goal]) => goal.area === area) : [];
  const goalItems = goalsInArea.map(([slug, goal]) => ({ value: slug, label: goal.label }));

  return (
    <FieldSet>
      <FieldLegend>¿Qué querés aprender?</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="quiz-area">Área</FieldLabel>
          <Select items={AREA_ITEMS} value={area} onValueChange={handleAreaChange}>
            <SelectTrigger id="quiz-area" className="w-full">
              <SelectValue placeholder="Elegí un área" />
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
        </Field>
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor="quiz-goal">Meta</FieldLabel>
          <Select
            items={goalItems}
            value={field.value || null}
            onValueChange={(value) => field.onChange(value ?? "")}
            disabled={!area}
          >
            <SelectTrigger id="quiz-goal" className="w-full" aria-invalid={!!fieldState.error}>
              <SelectValue placeholder={area ? "Elegí una meta" : "Elegí un área primero"} />
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
          <FieldError errors={[fieldState.error]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
