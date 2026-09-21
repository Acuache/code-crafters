import { z } from "zod";

import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES } from "@/lib/paths/interests";
import type { LearnerProfile } from "@/lib/paths/types";

// Las tres listas se derivan de las tablas del spec 04 — el cuestionario no mantiene su propia
// copia del vocabulario. z.enum() sobre un string[] valida en runtime e infiere `string`, que es
// exactamente lo que declaran GoalSlug/InterestSlug/TechnologySlug en lib/paths/types.ts.
const goalSlugs = Object.keys(GOALS);
const interestSlugs = Object.keys(INTERESTS);
const technologySlugs = Object.keys(TECHNOLOGIES);

// Los pasos 5 y 6 repiten estos límites como atributos del <input>/<textarea> (min, max,
// maxLength) y en el contador de caracteres: se exportan para que la UI y la validación no puedan
// desincronizarse en silencio.
export const MIN_HOURS_PER_WEEK = 3;
export const MAX_HOURS_PER_WEEK = 40;
export const MAX_FREE_TEXT_LENGTH = 500;

export const assessmentAnswersSchema = z.object({
  // Mensaje explícito: sin él, zod devuelve "Invalid option: expected one of \"react\"|\"vue\"|…"
  // con los 19 slugs de GOALS — un volcado interno, no un mensaje para el usuario del formulario.
  goal: z.enum(goalSlugs, { error: "Elegí una meta para continuar." }),
  // ExperienceLevel (lib/paths/types.ts) es un tipo, no un valor en runtime — el spec 04 no
  // exporta una lista de sus tres literales. Es la única excepción reconocida a "todo el
  // vocabulario se deriva de las tablas del spec 04": una copia manual, no un descuido.
  level: z.enum(["empiezo_de_cero", "tengo_bases", "intermedio"], {
    error: "Elegí tu nivel para continuar.",
  }),
  masteredTechnologies: z.array(z.enum(technologySlugs)),
  interests: z.array(z.enum(interestSlugs)),
  hoursPerWeek: z.number().int().min(MIN_HOURS_PER_WEEK).max(MAX_HOURS_PER_WEEK),
  deadlineMonths: z.union([z.literal(3), z.literal(6), z.literal(9), z.literal(12)]),
  freeText: z.string().max(MAX_FREE_TEXT_LENGTH),
});

export type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;

// Qué campos valida cada paso antes de dejar avanzar (form.trigger(STEP_FIELDS[i])).
export const STEP_FIELDS: readonly (keyof AssessmentAnswers)[][] = [
  ["goal"],
  ["level"],
  ["masteredTechnologies"],
  ["interests"],
  ["hoursPerWeek", "deadlineMonths"],
  ["freeText"],
];

// Valores iniciales del formulario (useForm({ defaultValues: QUIZ_DEFAULT_VALUES })). Sin esto,
// react-hook-form arranca los arrays en `undefined` (no `[]`) y `hoursPerWeek` en `NaN` con
// `valueAsNumber` — lo que en la práctica rompe los criterios de aceptación "Los pasos 3 y 4
// avanzan con cero chips marcados" y "El texto libre acepta quedar vacío". `hoursPerWeek` y
// `deadlineMonths` arrancan en el caso de referencia del ADR 0001 (6 meses × 10 h/semana): el
// extremo corto del rango del paso 5 (3 meses × 3 h = 39 h de presupuesto) no alcanza ni para el
// primer curso requerido de casi ninguna meta (ver Decisiones).
export const QUIZ_DEFAULT_VALUES: Partial<AssessmentAnswers> = {
  masteredTechnologies: [],
  interests: [],
  hoursPerWeek: 10,
  deadlineMonths: 6,
  freeText: "",
};

// Aserción de tipos: si LearnerProfile (spec 04) cambia sin que este schema lo siga, el tipo de
// abajo colapsa a `never` y tsc falla acá — no en el spec 07, adentro de buildPath(). Va como
// `satisfies` y no como variable para no dejar un binding sin usar que el linter marque.
type AssessmentAnswersMatchLearnerProfile =
  Omit<AssessmentAnswers, "freeText"> extends LearnerProfile ? true : never;
true satisfies AssessmentAnswersMatchLearnerProfile;
