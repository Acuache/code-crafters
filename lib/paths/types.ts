// Tipos del motor de reglas. No importa database.types.ts: el motor no conoce el esquema de
// Supabase, solo la forma mínima de datos que necesita.

export type Area = "frontend" | "backend" | "fullstack" | "movil" | "ia";

// El nivel que el usuario declara de sí mismo, no la dificultad de un curso (course_difficulty).
export type ExperienceLevel = "empiezo_de_cero" | "tengo_bases" | "intermedio";

// Nivel de un curso dentro de un programa oficial (enum program_course_level).
export type ProgramLevel = "requerido" | "recomendado" | "opcional";

// Un paso de Fundamentos no tiene un origin propio: se reconoce por
// `sourceProgramSlug: "fundamentos"`.
export type StepOrigin = ProgramLevel | "interes";

// `string` y no una unión cerrada: los valores válidos son las claves de GOALS, TECHNOLOGIES e
// INTERESTS, y los valida el zod del cuestionario y buildPath() en runtime.
export type GoalSlug = string;
export type TechnologySlug = string;
export type InterestSlug = string;

// Lo que arma el cuestionario y se guarda en assessments.answers.
export type LearnerProfile = {
  goal: GoalSlug;
  level: ExperienceLevel;
  masteredTechnologies: TechnologySlug[];
  interests: InterestSlug[];
  hoursPerWeek: number;
  deadlineMonths: number;
};

export type CourseDifficulty = "principiante" | "intermedio" | "avanzado";

export type CatalogCourse = {
  slug: string;
  title: string;
  hours: number;
  difficulty: CourseDifficulty;
  inConstruction: boolean;
  outcome?: string;
};

export type ProgramStepInput = {
  stage: number;
  level: ProgramLevel;
  note: string | null;
  courseSlugs: string[]; // más de uno = alternativas
};

export type ProgramInput = {
  slug: string;
  name: string;
  steps: ProgramStepInput[];
};

// Tabla course_prerequisites: `needs` suma el curso a la ruta; `bestAfter` solo ordena.
export type CoursePrerequisites = {
  needs: string[];
  bestAfter: string[];
};

// Las reglas que edita el admin (spec 17).
export type EngineRules = {
  // Por slug de curso.
  prerequisites: Record<string, CoursePrerequisites>;
  // Por slug de interés: sus cursos en orden de preferencia (tabla interest_courses).
  interestCourses: Record<InterestSlug, string[]>;
};

export type BuiltStep = {
  courseSlug: string;
  // null si el curso entró por interés y no pertenece a ningún programa de la ruta.
  sourceProgramSlug: string | null;
  stage: number; // ya renumerado 1..N sobre la ruta final
  position: number; // orden dentro de la misma etapa
  origin: StepOrigin;
  reason: string;
};

export type DiscardedStep = {
  courseSlug: string;
  sourceProgramSlug: string | null;
  // La etapa del programa oficial, o 0 si el curso no venía de uno: nunca llegó a ordenarse.
  stage: number;
  position: number;
  origin: StepOrigin;
  reason: string;
  discardReason: string;
};

export type BuiltPath = {
  goal: GoalSlug;
  title: string;
  summary: string;
  mergedProgramSlugs: string[];
  budgetHours: number;
  totalHours: number;
  fitsInBudget: boolean;
  overflowHours: number;
  steps: BuiltStep[];
  discarded: DiscardedStep[];
};
