import { describe, expect, it } from "vitest";

import { quizTargetSchema, validateAttemptInput } from "@/lib/quizzes/action-validation";

const QUIZ_ID = "550e8400-e29b-41d4-a716-446655440000";
const PATH_ID = "550e8400-e29b-41d4-a716-446655440001";
const STEP_ID = "550e8400-e29b-41d4-a716-446655440002";
const IDEMPOTENCY_KEY = "550e8400-e29b-41d4-a716-446655440003";

describe("límites de entrada de las actions de quiz", () => {
  it("rechaza una respuesta fuera de las cuatro opciones antes de tocar la base", () => {
    const result = validateAttemptInput({
      quizId: QUIZ_ID,
      pathId: PATH_ID,
      pathStepId: STEP_ID,
      answers: [0, 4],
      timezone: "UTC",
      idempotencyKey: IDEMPOTENCY_KEY,
    });

    expect(result.success).toBe(false);
  });

  it("acepta un intento bien formado", () => {
    const result = validateAttemptInput({
      quizId: QUIZ_ID,
      pathId: PATH_ID,
      pathStepId: STEP_ID,
      answers: [0, 3, 1],
      timezone: "America/Lima",
      idempotencyKey: IDEMPOTENCY_KEY,
    });

    expect(result.success).toBe(true);
  });

  it("exige título de capítulo solo como texto no vacío", () => {
    const base = { pathId: PATH_ID, pathStepId: STEP_ID, kind: "chapter" };

    expect(quizTargetSchema.safeParse({ ...base, chapterTitle: "Genéricos" }).success).toBe(true);
    expect(quizTargetSchema.safeParse({ ...base, chapterTitle: "  " }).success).toBe(false);
  });
});
