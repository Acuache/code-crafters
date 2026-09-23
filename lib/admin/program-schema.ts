// Schemas del programa y de la ubicación de un curso en un programa (SPEC 10). Igual que
// course-schema.ts, los comparten el formulario y las server actions.

import { z } from "zod";

import { SLUG_PATTERN, blankToNull } from "./course-schema";

export const PROGRAM_COURSE_LEVELS = ["requerido", "recomendado", "opcional"] as const;

export const programSchema = z.object({
  slug: z
    .string()
    .regex(SLUG_PATTERN, { error: "Usá minúsculas, números y guiones (ej. svelte)." }),
  name: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  position: z
    .number({ error: "Indicá la posición." })
    .int({ error: "La posición es un número entero." })
    .positive({ error: "La posición empieza en 1." }),
});

export const placementSchema = z.object({
  programId: z
    .number({ error: "Elegí un programa." })
    .int()
    .positive({ error: "Elegí un programa." }),
  stage: z
    .number({ error: "Indicá la etapa." })
    .int({ error: "La etapa es un número entero." })
    .positive({ error: "La etapa empieza en 1." }),
  level: z.enum(PROGRAM_COURSE_LEVELS, { error: "Elegí un nivel." }),
  note: z.preprocess(blankToNull, z.string().trim().nullable()),
});

export type ProgramFormValues = z.input<typeof programSchema>;
export type ProgramInput = z.output<typeof programSchema>;
export type PlacementFormValues = z.input<typeof placementSchema>;
export type PlacementInput = z.output<typeof placementSchema>;
