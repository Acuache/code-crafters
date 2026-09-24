import { z } from "zod";

import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES } from "@/lib/paths/interests";
import { EXPERIENCE_LEVELS } from "@/lib/paths/levels";
import type { LearnerProfile } from "@/lib/paths/types";

// El vocabulario sale de las tablas del motor: el cuestionario no mantiene su propia copia.
const goalSlugs = Object.keys(GOALS);
const interestSlugs = Object.keys(INTERESTS);
const technologySlugs = Object.keys(TECHNOLOGIES);

// Los usan también los inputs y el contador de caracteres, para que no se desincronicen.
export const MIN_HOURS_PER_WEEK = 3;
export const MAX_HOURS_PER_WEEK = 40;
export const MAX_FREE_TEXT_LENGTH = 500;

export const assessmentAnswersSchema = z.object({
  // Sin mensaje propio, zod listaría todos los slugs de GOALS.
  goal: z.enum(goalSlugs, { error: "Elige una meta para continuar." }),
  level: z.enum(EXPERIENCE_LEVELS, { error: "Elige tu nivel para continuar." }),
  masteredTechnologies: z.array(z.enum(technologySlugs)),
  interests: z.array(z.enum(interestSlugs)),
  hoursPerWeek: z.number().int().min(MIN_HOURS_PER_WEEK).max(MAX_HOURS_PER_WEEK),
  deadlineMonths: z.union([z.literal(3), z.literal(6), z.literal(9), z.literal(12)]),
  freeText: z.string().max(MAX_FREE_TEXT_LENGTH),
});

export type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;

// Qué campos valida cada paso antes de dejar avanzar.
export const STEP_FIELDS: readonly (keyof AssessmentAnswers)[][] = [
  ["goal"],
  ["level"],
  ["masteredTechnologies"],
  ["interests"],
  ["hoursPerWeek", "deadlineMonths"],
  ["freeText"],
];

// Sin estos valores, react-hook-form arranca los arrays en `undefined` y las horas en NaN. El
// tiempo arranca en 6 meses × 10 h/semana: el mínimo (39 h) no alcanza ni para el primer curso
// requerido de casi ninguna meta.
export const QUIZ_DEFAULT_VALUES: Partial<AssessmentAnswers> = {
  masteredTechnologies: [],
  interests: [],
  hoursPerWeek: 10,
  deadlineMonths: 6,
  freeText: "",
};

// Si LearnerProfile cambia sin que este schema lo siga, tsc falla acá y no dentro de buildPath().
type AssessmentAnswersMatchLearnerProfile =
  Omit<AssessmentAnswers, "freeText"> extends LearnerProfile ? true : never;
true satisfies AssessmentAnswersMatchLearnerProfile;
