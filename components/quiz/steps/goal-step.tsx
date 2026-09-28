"use client";

import Image from "next/image";
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
import type { Area, GoalSlug } from "@/lib/paths/types";

const AREA_LABELS: Record<Area, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  movil: "Móvil",
  ia: "IA",
};

const AREA_ICON_PATHS: Record<Area, string> = {
  frontend: "/languages-icons/frontend.svg",
  backend: "/languages-icons/backend.svg",
  fullstack: "/languages-icons/fullstack.svg",
  movil: "/languages-icons/movil.svg",
  ia: "/languages-icons/ia-aplicada.svg",
};

const PROGRAM_ICON_PATHS: Record<string, string> = {
  react: "/languages-icons/react.svg",
  vue: "/languages-icons/vue.svg",
  angular: "/languages-icons/angular.svg",
  node: "/languages-icons/nodejs.svg",
  nest: "/languages-icons/nestjs.svg",
  java: "/languages-icons/java.svg",
  csharp: "/languages-icons/csharp.svg",
  python: "/languages-icons/python.svg",
  php: "/languages-icons/php.svg",
  go: "/languages-icons/go.svg",
  "react-native": "/languages-icons/react.svg",
  "dart-movil": "/languages-icons/flutter.svg",
  ia: "/languages-icons/ia-aplicada.svg",
};

const AREA_ITEMS = AREAS.map((area) => ({
  value: area,
  label: AREA_LABELS[area],
  iconPaths: [AREA_ICON_PATHS[area]],
}));

function getProgramIconPaths(goalSlug: GoalSlug): string[] {
  return GOALS[goalSlug].programSlugs.map((programSlug) => {
    const iconPath = PROGRAM_ICON_PATHS[programSlug];
    if (!iconPath) {
      throw new Error(`Falta el icono para el programa "${programSlug}" de la meta "${goalSlug}".`);
    }

    return iconPath;
  });
}

function SelectOptionContent({
  iconPaths,
  label,
}: {
  iconPaths: readonly string[];
  label: string;
}) {
  return (
    <>
      {iconPaths.map((iconPath) => (
        <Image
          key={iconPath}
          src={iconPath}
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          className="size-4 shrink-0 object-contain"
        />
      ))}
      <span>{label}</span>
    </>
  );
}

type GoalStepProps = {
  control: Control<AssessmentAnswers>;
  clearGoalError?: UseFormClearErrors<AssessmentAnswers>;
};

export function GoalStep({ control, clearGoalError }: GoalStepProps) {
  const { field, fieldState } = useController({ control, name: "goal" });
  const [area, setArea] = useState<Area | null>(() =>
    field.value ? (GOALS[field.value]?.area ?? null) : null,
  );
  const hasAreaError = !area && !!fieldState.error;

  // Cambiar de área limpia la meta elegida: una meta de otra área ya no es una opción válida.
  function handleAreaChange(nextArea: Area | null) {
    setArea(nextArea);
    field.onChange("");
    clearGoalError?.("goal");
  }

  const goalsInArea = area ? Object.entries(GOALS).filter(([, goal]) => goal.area === area) : [];
  const goalItems = goalsInArea.map(([slug, goal]) => ({
    value: slug,
    label: goal.label,
    iconPaths: getProgramIconPaths(slug),
  }));
  const selectedArea = AREA_ITEMS.find((item) => item.value === area);
  const selectedGoal = goalItems.find((item) => item.value === field.value);

  return (
    <FieldSet>
      <FieldLegend>¿Qué quieres aprender?</FieldLegend>
      <FieldGroup>
        <Field data-invalid={hasAreaError}>
          <FieldLabel htmlFor="quiz-area">Área</FieldLabel>
          <Select items={AREA_ITEMS} value={area} onValueChange={handleAreaChange}>
            <SelectTrigger id="quiz-area" className="w-full" aria-invalid={hasAreaError}>
              <SelectValue placeholder="Elige un área">
                {selectedArea ? (
                  <SelectOptionContent
                    iconPaths={selectedArea.iconPaths}
                    label={selectedArea.label}
                  />
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {AREA_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <SelectOptionContent iconPaths={item.iconPaths} label={item.label} />
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
              <SelectValue placeholder={area ? "Elige una meta" : "Elige un área primero"}>
                {selectedGoal ? (
                  <SelectOptionContent
                    iconPaths={selectedGoal.iconPaths}
                    label={selectedGoal.label}
                  />
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {goalItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <SelectOptionContent iconPaths={item.iconPaths} label={item.label} />
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
