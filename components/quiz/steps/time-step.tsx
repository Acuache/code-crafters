"use client";

import { type Control, useController } from "react-hook-form";

import {
  MAX_HOURS_PER_WEEK,
  MIN_HOURS_PER_WEEK,
  type AssessmentAnswers,
} from "@/components/quiz/quiz-schema";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DeadlineMonths = AssessmentAnswers["deadlineMonths"];

const DEADLINE_ITEMS: { value: DeadlineMonths; label: string }[] = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 9, label: "9 meses" },
  { value: 12, label: "12 meses" },
];

export function TimeStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field: hoursField, fieldState: hoursFieldState } = useController({
    control,
    name: "hoursPerWeek",
  });
  const { field: deadlineField, fieldState: deadlineFieldState } = useController({
    control,
    name: "deadlineMonths",
  });

  return (
    <FieldSet>
      <FieldLegend>¿Cuánto tiempo tienes?</FieldLegend>
      <FieldGroup>
        <Field data-invalid={!!hoursFieldState.error}>
          <FieldLabel htmlFor="quiz-hours">Horas por semana</FieldLabel>
          <Input
            id="quiz-hours"
            type="number"
            inputMode="numeric"
            min={MIN_HOURS_PER_WEEK}
            max={MAX_HOURS_PER_WEEK}
            step={1}
            aria-invalid={!!hoursFieldState.error}
            name={hoursField.name}
            // Vaciar el input deja `valueAsNumber` en NaN: se muestra como campo vacío en vez de
            // como el texto "NaN", y el schema lo rechaza al intentar avanzar.
            value={Number.isNaN(hoursField.value) ? "" : hoursField.value}
            onChange={(event) => hoursField.onChange(event.target.valueAsNumber)}
            onBlur={hoursField.onBlur}
          />
          <FieldError errors={[hoursFieldState.error]} />
        </Field>
        <Field data-invalid={!!deadlineFieldState.error}>
          <FieldLabel htmlFor="quiz-deadline">Plazo</FieldLabel>
          <Select
            items={DEADLINE_ITEMS}
            value={deadlineField.value}
            onValueChange={(value) => deadlineField.onChange(value)}
          >
            <SelectTrigger
              id="quiz-deadline"
              className="w-full"
              aria-invalid={!!deadlineFieldState.error}
            >
              <SelectValue placeholder="Elige un plazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DEADLINE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[deadlineFieldState.error]} />
        </Field>
        <FieldDescription>
          Las rutas oficiales completas rondan 150–280 h; con 10 h/semana y 6 meses tienes 260 h de
          presupuesto.
        </FieldDescription>
      </FieldGroup>
    </FieldSet>
  );
}
