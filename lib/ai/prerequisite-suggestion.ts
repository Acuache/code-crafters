import { z } from "zod";

// La IA sugiere requisitos al admin (spec 17); no guarda nada, el admin decide.

export const MAX_SUGGESTIONS = 6;
export const MAX_SUGGESTION_REASON_LENGTH = 160;

// `courseSlug` solo puede ser un curso real del catálogo: la IA no inventa cursos.
export function buildPrerequisiteSuggestionSchema(courseSlugs: [string, ...string[]]) {
  return z.object({
    suggestions: z
      .array(
        z.object({
          courseSlug: z.enum(courseSlugs),
          kind: z.enum(["necesita", "conviene"]),
          reason: z.string().trim().min(1).max(MAX_SUGGESTION_REASON_LENGTH),
        }),
      )
      .max(MAX_SUGGESTIONS),
  });
}

export type PrerequisiteSuggestions = z.infer<ReturnType<typeof buildPrerequisiteSuggestionSchema>>;

export type SuggestionCourse = {
  slug: string;
  title: string;
  difficulty: string;
};

export type PrerequisiteSuggestionInput = {
  course: SuggestionCourse & { prerequisitesText: string[] };
  // El resto del catálogo activo, sin el curso ni sus requisitos actuales.
  candidates: SuggestionCourse[];
};

export function buildPrerequisiteSuggestionPrompt(input: PrerequisiteSuggestionInput): {
  system: string;
  prompt: string;
} {
  const system = [
    "Ayudas al administrador de DevPathlles, un generador de rutas de aprendizaje sobre los cursos de DevTalles.",
    "Tu tarea: decir qué cursos del catálogo conviene tomar antes de un curso dado.",
    '"necesita": sin ese curso no se puede seguir el curso dado (lo exige el texto del instructor).',
    '"conviene": ayuda tomarlo antes, pero no es obligatorio.',
    `Sugiere como máximo ${MAX_SUGGESTIONS}, solo cursos de la lista. Si el texto no pide ningún curso de la lista, devuelve una lista vacía.`,
    `Cada razón en español neutro, tuteando, de hasta ${MAX_SUGGESTION_REASON_LENGTH} caracteres, citando lo que dice el instructor.`,
  ].join("\n");

  const requirements =
    input.course.prerequisitesText.length > 0
      ? input.course.prerequisitesText.map((line) => `- ${line}`).join("\n")
      : "- (el instructor no escribió requisitos)";

  const catalog = input.candidates
    .map((candidate) => `- ${candidate.slug}: ${candidate.title} (${candidate.difficulty})`)
    .join("\n");

  const prompt = [
    `Curso: ${input.course.title} (${input.course.slug}, ${input.course.difficulty})`,
    "Requisitos que escribió el instructor:",
    requirements,
    "",
    "Cursos del catálogo que puedes sugerir (slug: título):",
    catalog,
  ].join("\n");

  return { system, prompt };
}
