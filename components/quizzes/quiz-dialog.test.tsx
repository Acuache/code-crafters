// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AttemptResult } from "@/app/(app)/paths/[id]/actions";

import { QuizDialog, type QuizTarget } from "./quiz-dialog";
import { QuizResult } from "./quiz-result";

function makeQuestion(id: string) {
  return {
    id,
    prompt: `Pregunta ${id}`,
    options: ["A", "B", "C", "D"] as [string, string, string, string],
  };
}

const chapterQuiz = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Hooks",
  kind: "chapter" as const,
  passPercentage: 60,
  questions: [makeQuestion("1"), makeQuestion("2"), makeQuestion("3")],
};

const target: QuizTarget = {
  pathId: "20000000-0000-4000-8000-000000000001",
  pathStepId: "30000000-0000-4000-8000-000000000001",
  kind: "chapter",
  chapterTitle: "Hooks",
};

function makeResult(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    attemptId: "40000000-0000-4000-8000-000000000001",
    correctCount: 3,
    scorePercentage: 100,
    passed: true,
    streakIncreased: true,
    stepCompleted: false,
    results: chapterQuiz.questions.map((question) => ({
      questionId: question.id,
      selectedOption: 0,
      correctOption: 0,
      correct: true,
      explanation: `Explicación ${question.id}`,
    })),
    ...overrides,
  };
}

afterEach(cleanup);

describe("QuizDialog", () => {
  it("carga el quiz y no deja avanzar sin elegir una opción", async () => {
    const requestQuiz = vi.fn().mockResolvedValue({ ok: true, data: chapterQuiz });

    render(
      <QuizDialog
        target={target}
        onClose={vi.fn()}
        onAttemptSaved={vi.fn()}
        requestQuizAction={requestQuiz}
        submitAttemptAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Preparando tu quiz…")).toBeTruthy();
    expect(await screen.findByText("Pregunta 1")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("no muestra la corrección hasta entregar, y después la muestra por pregunta", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue({ ok: true, data: makeResult() });
    const onAttemptSaved = vi.fn();

    render(
      <QuizDialog
        target={target}
        onClose={vi.fn()}
        onAttemptSaved={onAttemptSaved}
        requestQuizAction={vi.fn().mockResolvedValue({ ok: true, data: chapterQuiz })}
        submitAttemptAction={submit}
      />,
    );

    await screen.findByText("Pregunta 1");
    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getByRole("radio", { name: "A" }));
      expect(screen.queryByText(/Explicación/)).toBeNull();
      const nextLabel = index < 2 ? "Siguiente" : "Entregar";
      await user.click(screen.getByRole("button", { name: nextLabel }));
    }

    expect(await screen.findByText("¡Quiz aprobado!")).toBeTruthy();
    expect(screen.getByText("Explicación 1")).toBeTruthy();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ answers: [0, 0, 0] }));
    expect(onAttemptSaved).toHaveBeenCalledOnce();
  });

  it("ofrece reintentar si falla la generación", async () => {
    const user = userEvent.setup();
    const requestQuiz = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "No pudimos preparar el quiz." })
      .mockResolvedValueOnce({ ok: true, data: chapterQuiz });

    render(
      <QuizDialog
        target={target}
        onClose={vi.fn()}
        onAttemptSaved={vi.fn()}
        requestQuizAction={requestQuiz}
        submitAttemptAction={vi.fn()}
      />,
    );

    expect(await screen.findByText("No pudimos preparar el quiz.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    expect(await screen.findByText("Pregunta 1")).toBeTruthy();
  });
});

describe("QuizResult", () => {
  it("avisa que el curso quedó hecho al aprobar el quiz del curso", () => {
    render(
      <QuizResult
        kind="course"
        questions={chapterQuiz.questions}
        result={makeResult({ stepCompleted: true })}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/Marcamos el curso como hecho/)).toBeTruthy();
  });

  it("ofrece otro intento y muestra la respuesta correcta al desaprobar", () => {
    const failedResult = makeResult({
      passed: false,
      correctCount: 0,
      scorePercentage: 0,
      results: chapterQuiz.questions.map((question) => ({
        questionId: question.id,
        selectedOption: 1,
        correctOption: 0,
        correct: false,
        explanation: "Porque sí",
      })),
    });

    render(
      <QuizResult
        kind="course"
        questions={chapterQuiz.questions}
        result={failedResult}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Reintentar quiz" })).toBeTruthy();
    expect(screen.getAllByText("Respuesta correcta: A")).toHaveLength(3);
  });
});
