import { z } from "zod";

const uuid = z.string().uuid();

const attemptInputSchema = z.object({
  quizId: uuid,
  pathId: uuid,
  pathStepId: uuid,
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(10),
  timezone: z.string().max(100),
  idempotencyKey: uuid,
});

export const validateAttemptInput = (input: unknown) => attemptInputSchema.safeParse(input);

export function normalizeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}
