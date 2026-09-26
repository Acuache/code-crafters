import { describe, expect, it } from "vitest";

import { validateAttemptInput } from "@/lib/quizzes/action-validation";
import { MAX_QUIZ_QUESTIONS } from "@/lib/quizzes/schema";

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

  it("acepta tantas respuestas como preguntas puede tener un quiz, y no más", () => {
    const attempt = {
      quizId: QUIZ_ID,
      pathId: PATH_ID,
      pathStepId: STEP_ID,
      timezone: "UTC",
      idempotencyKey: IDEMPOTENCY_KEY,
    };
    const answersFor = (count: number) => Array.from({ length: count }, () => 0);

    const fullQuiz = validateAttemptInput({ ...attempt, answers: answersFor(MAX_QUIZ_QUESTIONS) });
    const tooManyAnswers = validateAttemptInput({
      ...attempt,
      answers: answersFor(MAX_QUIZ_QUESTIONS + 1),
    });

    expect(fullQuiz.success).toBe(true);
    expect(tooManyAnswers.success).toBe(false);
  });
});
