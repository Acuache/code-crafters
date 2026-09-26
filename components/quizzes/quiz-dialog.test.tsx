// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AttemptResult } from "@/app/(app)/paths/[id]/actions";
import type { CourseQuiz } from "@/lib/quizzes/schema";

import { QuizDialog, type QuizSession } from "./quiz-dialog";
import { QuizResult } from "./quiz-result";

// La opción correcta de cada pregunta es "A" (índice 0).
function makeQuestion(id: string) {
  return {
    id,
    prompt: `Pregunta ${id}`,
    options: ["A", "B", "C", "D"] as [string, string, string, string],
    correctOption: 0,
    explanation: `Explicación ${id}`,
  };
}

const quiz: CourseQuiz = {
  id: "10000000-0000-4000-8000-000000000001",
  courseId: 1,
  passPercentage: 60,
  questions: [makeQuestion("1"), makeQuestion("2"), makeQuestion("3")],
};

const session: QuizSession = {
  quiz,
  courseTitle: "Git desde cero",
  pathId: "20000000-0000-4000-8000-000000000001",
  pathStepId: "30000000-0000-4000-8000-000000000001",
};

function makeResult(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    attemptId: "40000000-0000-4000-8000-000000000001",
    correctCount: 3,
    scorePercentage: 100,
    passed: true,
    streakIncreased: true,
    stepCompleted: true,
    results: quiz.questions.map((question) => ({
      questionId: question.id,
      selectedOption: 0,
      correctOption: 0,
      correct: true,
      explanation: question.explanation,
    })),
    ...overrides,
  };
}

function renderDialog(submitAttemptAction = vi.fn(), onAttemptSaved = vi.fn()) {
  render(
    <QuizDialog
      session={session}
      onClose={vi.fn()}
      onAttemptSaved={onAttemptSaved}
      submitAttemptAction={submitAttemptAction}
    />,
  );
}

async function answerAllWith(user: ReturnType<typeof userEvent.setup>, optionName: string) {
  for (let index = 0; index < quiz.questions.length; index += 1) {
    await user.click(screen.getByRole("radio", { name: optionName }));
    const nextLabel = index < quiz.questions.length - 1 ? "Siguiente" : "Entregar";
    await user.click(screen.getByRole("button", { name: nextLabel }));
  }
}

afterEach(cleanup);

describe("QuizDialog", () => {
  it("abre al instante en la primera pregunta y no deja avanzar sin responder", () => {
    renderDialog();

    expect(screen.getByText("Pregunta 1")).toBeTruthy();
    expect(screen.getByText("3 preguntas · apruebas con 60 %")).toBeTruthy();
    expect(screen.queryByText(/Preparando/)).toBeNull();
    expect((screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("al elegir una opción incorrecta la deja fija y muestra la correcta y la explicación", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "B" }));

    expect(screen.getByText("Incorrecto")).toBeTruthy();
    expect(screen.getByText("La respuesta correcta es: A")).toBeTruthy();
    expect(screen.getByText("Explicación 1")).toBeTruthy();

    // La respuesta ya no cambia: la opción correcta queda deshabilitada y B sigue marcada.
    const correctOption = screen.getByRole("radio", { name: "A" });
    expect(correctOption.getAttribute("aria-disabled")).toBe("true");
    await user.click(correctOption);
    expect(screen.getByRole("radio", { name: "B" }).getAttribute("aria-checked")).toBe("true");
    expect(correctOption.getAttribute("aria-checked")).toBe("false");
  });

  it("al acertar lo confirma sin repetir la respuesta correcta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("radio", { name: "A" }));

    expect(screen.getByText("¡Correcto!")).toBeTruthy();
    expect(screen.queryByText(/La respuesta correcta es/)).toBeNull();
    expect(screen.getByText("Explicación 1")).toBeTruthy();
  });

  it("Entregar manda todas las respuestas y muestra el resultado", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue({ ok: true, data: makeResult() });
    const onAttemptSaved = vi.fn();
    renderDialog(submit, onAttemptSaved);

    await answerAllWith(user, "A");

    expect(await screen.findByText("¡Quiz aprobado!")).toBeTruthy();
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId: quiz.id,
        pathId: session.pathId,
        pathStepId: session.pathStepId,
        answers: [0, 0, 0],
      }),
    );
    expect(onAttemptSaved).toHaveBeenCalledOnce();
  });

  it("si se corta la conexión al entregar, avisa y deja reintentar con la misma clave", async () => {
    const user = userEvent.setup();
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, data: makeResult() });
    renderDialog(submit);

    await answerAllWith(user, "A");

    expect(await screen.findByText(/Se perdió la conexión/)).toBeTruthy();
    expect(screen.queryByText(/Guardando tu intento/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    await user.click(screen.getByRole("button", { name: "Entregar" }));

    expect(await screen.findByText("¡Quiz aprobado!")).toBeTruthy();
    const [firstCall, secondCall] = submit.mock.calls;
    expect(secondCall[0].idempotencyKey).toBe(firstCall[0].idempotencyKey);
  });
});

describe("QuizResult", () => {
  it("avisa que el curso quedó hecho y que sumó a la racha", () => {
    render(
      <QuizResult
        questions={quiz.questions}
        passPercentage={60}
        result={makeResult()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/Marcamos el curso como hecho/)).toBeTruthy();
    expect(screen.getByText("Sumaste un día a tu racha")).toBeTruthy();
  });

  it("al desaprobar usa el porcentaje del quiz y ofrece otro intento", () => {
    const failedResult = makeResult({
      passed: false,
      stepCompleted: false,
      streakIncreased: false,
      correctCount: 0,
      scorePercentage: 0,
      results: quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOption: 1,
        correctOption: 0,
        correct: false,
        explanation: question.explanation,
      })),
    });

    render(
      <QuizResult
        questions={quiz.questions}
        passPercentage={75}
        result={failedResult}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/Necesitas 75 % para aprobar/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar quiz" })).toBeTruthy();
    expect(screen.getAllByText("Respuesta correcta: A")).toHaveLength(3);
    expect(screen.queryByText(/racha/)).toBeNull();
  });
});
