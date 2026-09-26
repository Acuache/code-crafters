import { z } from "zod";

import { MAX_QUIZ_QUESTIONS } from "./schema";

// Lo que manda el navegador al entregar un quiz. La action es un endpoint público: nada de esto se
// da por válido solo porque la UI lo arme bien.
const attemptInputSchema = z.object({
  quizId: z.uuid(),
  pathId: z.uuid(),
  pathStepId: z.uuid(),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(MAX_QUIZ_QUESTIONS),
  // La validación real de la zona la hace Postgres (cae a UTC si no existe).
  timezone: z.string().min(1).max(64),
  idempotencyKey: z.uuid(),
});

export function validateAttemptInput(input: unknown) {
  return attemptInputSchema.safeParse(input);
}
