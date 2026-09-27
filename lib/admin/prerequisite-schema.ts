// Schema de un requisito entre cursos (spec 17), compartido por el formulario y las actions.

import { z } from "zod";

// Los valores del enum course_prerequisite_kind.
export const PREREQUISITE_KINDS = ["necesita", "conviene"] as const;

export type PrerequisiteKind = (typeof PREREQUISITE_KINDS)[number];

export const PREREQUISITE_KIND_LABELS: Record<PrerequisiteKind, string> = {
  necesita: "Necesita",
  conviene: "Conviene antes",
};

export const prerequisiteSchema = z.object({
  prerequisiteCourseId: z
    .number({ error: "Elige un curso." })
    .int()
    .positive({ error: "Elige un curso." }),
  kind: z.enum(PREREQUISITE_KINDS, { error: "Elige si lo necesita o si conviene antes." }),
});

export type PrerequisiteFormValues = z.input<typeof prerequisiteSchema>;
export type PrerequisiteInput = z.output<typeof prerequisiteSchema>;

// Lo que la IA sugiere, ya cruzado con los ids reales del catálogo.
export type PrerequisiteSuggestion = {
  courseId: number;
  title: string;
  kind: PrerequisiteKind;
  reason: string;
};
