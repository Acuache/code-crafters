import { z } from "zod";

// Largos máximos que el prompt le pide al modelo y que el schema vuelve a exigir: el prompt solo
// pide, el schema es lo que garantiza que un título desbordado nunca llegue a la base.
export const MAX_TITLE_LENGTH = 80;
export const MAX_SUMMARY_LENGTH = 400;
export const MAX_REASON_LENGTH = 240;

// El schema se arma por ruta porque `courseSlug` solo puede ser uno de los pasos vigentes de ESA
// ruta: es la barrera (ADR 0001) que impide que la IA nombre un curso que el motor no eligió.
// Sin `.optional()` ni `.nullish()`: la salida estructurada de OpenAI los rechaza.
export function buildPersonalizationSchema(courseSlugs: [string, ...string[]]) {
  return z.object({
    title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
    summary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
    reasons: z.array(
      z.object({
        courseSlug: z.enum(courseSlugs),
        reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
      }),
    ),
  });
}

export type Personalization = z.infer<ReturnType<typeof buildPersonalizationSchema>>;
