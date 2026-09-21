// Tipos del motor de reglas (SPEC 04). No importa lib/supabase/database.types.ts:
// el motor no conoce el esquema de Supabase, solo la forma mínima de datos que necesita.

export type Area = "frontend" | "backend" | "fullstack" | "movil" | "ia";

// Mismas tres opciones que muestra el paso 3 del cuestionario (spec 06). No reusa
// course_difficulty (spec 02): ese es el nivel de un CURSO; este es el nivel que el usuario
// declara de sí mismo, y determina si se antepone `fundamentos` (ver Decisiones del spec).
export type ExperienceLevel = "empiezo_de_cero" | "tengo_bases" | "intermedio";

// Sin "base": un paso de Fundamentos tiene el origin que le corresponde por su propio `level`
// (`requerido`/`recomendado`), igual que cualquier otro programa. Se identifica como Fundamentos
// por `sourceProgramSlug: "fundamentos"`, no por un origin especial (ver Decisiones del spec).
export type StepOrigin = "requerido" | "recomendado" | "opcional" | "interes";

// Los tres alias siguientes son `string`, no una unión cerrada: este archivo se commitea antes de
// que existan GOALS/INTERESTS/TECHNOLOGIES. La validación real pasa en dos lugares: el zod del
// spec 06 deriva su `z.enum` de `Object.keys(GOALS)` una vez que `goals.ts` existe, y `buildPath()`
// valida `profile.goal` en runtime — no hay ningún punto donde un slug inválido pase inadvertido.
export type GoalSlug = string; // una clave de GOALS, ver lib/paths/goals.ts
export type TechnologySlug = string; // una clave de TECHNOLOGIES, ver lib/paths/interests.ts
export type InterestSlug = string; // una clave de INTERESTS, ver lib/paths/interests.ts

// Lo que arma el cuestionario del spec 06 y persiste en assessments.answers.
export type LearnerProfile = {
  goal: GoalSlug;
  level: ExperienceLevel;
  masteredTechnologies: TechnologySlug[];
  interests: InterestSlug[];
  hoursPerWeek: number; // 3-40, lo valida el zod del spec 06
  deadlineMonths: number; // lo valida el zod del spec 06
};

// Forma mínima de un curso que el motor necesita — no la fila completa de `courses` (spec 02).
export type CatalogCourse = {
  slug: string;
  hours: number;
  difficulty?: "principiante" | "intermedio" | "avanzado"; // pass-through, sin uso en la lógica
  outcome?: string; // pass-through, sin uso en la lógica
};

// Un paso de `programs.json`/`program_courses` tal como lo necesita el motor.
export type ProgramStepInput = {
  stage: number;
  level: "requerido" | "recomendado" | "opcional";
  note: string | null;
  courseSlugs: string[]; // más de uno = alternativas
};

export type ProgramInput = {
  slug: string; // uno de los 15 valores de `programs.slug` (spec 02)
  steps: ProgramStepInput[];
};

export type BuiltStep = {
  courseSlug: string;
  sourceProgramSlug: string | null; // null si el curso entró por interés y no pertenece a
  // ninguno de los programas fusionados de esta ruta (el caso normal, ver ADR 0003)
  stage: number; // ya renumerado 1..N sobre la ruta final, no el `stage` del programa de origen
  position: number; // orden dentro de la misma etapa
  origin: StepOrigin;
  reason: string; // frase parametrizada (ADR 0004 pieza 3)
};

export type DiscardedStep = {
  courseSlug: string;
  sourceProgramSlug: string | null;
  // El stage/position que tenía el paso al momento de descartarse — no el 1..N final de
  // BuiltStep, porque el descarte ocurre antes de renumberStages. Mismos cuatro campos NOT NULL
  // que `path_steps` exige (spec 02): el spec 07 los inserta tal cual, sin inventar valores.
  stage: number;
  position: number;
  origin: StepOrigin;
  reason: string; // igual que en BuiltStep: por qué este curso iba camino a la ruta
  discardReason: string; // "ya lo dominás" | "no cabía en tu tiempo" | "superaba el cupo de intereses"
};

export type BuiltPath = {
  goal: GoalSlug;
  title: string;
  summary: string;
  mergedProgramSlugs: string[]; // los programSlugs de la meta, en el orden de GOALS
  budgetHours: number;
  totalHours: number;
  fitsInBudget: boolean;
  overflowHours: number; // 0 si fitsInBudget es true
  steps: BuiltStep[];
  discarded: DiscardedStep[];
};
