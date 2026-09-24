import { z } from "zod";

// Los datos que manda el navegador al pedir y al entregar un quiz. Las actions son endpoints
// públicos: nada de esto se da por válido solo porque la UI lo arme bien.
export const quizTargetSchema = z.object({
  pathId: z.uuid(),
  pathStepId: z.uuid(),
  kind: z.enum(["course", "chapter"]),
  chapterTitle: z.string().trim().min(1).max(300).nullable(),
});

export type QuizTargetInput = z.infer<typeof quizTargetSchema>;

const attemptInputSchema = z.object({
  quizId: z.uuid(),
  pathId: z.uuid(),
  pathStepId: z.uuid(),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(10),
  // La validación real de la zona la hace Postgres (cae a UTC si no existe).
  timezone: z.string().min(1).max(64),
  idempotencyKey: z.uuid(),
});

export function validateAttemptInput(input: unknown) {
  return attemptInputSchema.safeParse(input);
}
