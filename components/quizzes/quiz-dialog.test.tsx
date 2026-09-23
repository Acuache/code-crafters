// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuizDialog } from "./quiz-dialog";
import { QuizResult } from "./quiz-result";

const question = (id: string) => ({ id, prompt: `Pregunta ${id}`, options: ["A", "B", "C", "D"] as [string, string, string, string] });
const quiz = { id: "10000000-0000-4000-8000-000000000001", title: "React", kind: "chapter" as const, passPercentage: 60, questions: [question("1"), question("2"), question("3")] };
const target = { pathId: "20000000-0000-4000-8000-000000000001", pathStepId: "30000000-0000-4000-8000-000000000001", kind: "chapter" as const, chapterTitle: "Hooks" };

afterEach(cleanup);

describe("QuizDialog", () => {
  it("loads a chapter quiz and requires a selection", async () => {
    const requestQuiz = vi.fn().mockResolvedValue({ ok: true, data: quiz });
    render(<QuizDialog open target={target} onClose={() => undefined} requestQuizAction={requestQuiz} checkAnswerAction={vi.fn()} submitAttemptAction={vi.fn()} onCompleted={() => undefined} />);
    expect(screen.getByText("Preparando tu quiz…")).toBeTruthy();
    expect(await screen.findByText("3 preguntas de práctica")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Comprobar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("locks feedback, shows its explanation and submits all answers", async () => {
    const user = userEvent.setup();
    const check = vi.fn().mockResolvedValue({ ok: true, data: { correct: true, explanation: "Porque es correcta" } });
    const submit = vi.fn().mockResolvedValue({ ok: true, data: { attemptId: "attempt-a", correctCount: 3, scorePercentage: 100, passed: true, streakCurrent: 2, streakBest: 2, streakIncreased: true, stepCompleted: false, nextStepId: null } });
    render(<QuizDialog open target={target} onClose={() => undefined} requestQuizAction={vi.fn().mockResolvedValue({ ok: true, data: quiz })} checkAnswerAction={check} submitAttemptAction={submit} onCompleted={() => undefined} />);
    await screen.findByText("Pregunta 1");
    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getByLabelText("A"));
      await user.click(screen.getByRole("button", { name: "Comprobar" }));
      expect(await screen.findByText("Porque es correcta")).toBeTruthy();
      if (index < 2) await user.click(screen.getByRole("button", { name: "Siguiente" }));
    }
    await user.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByText("¡Quiz aprobado!")).toBeTruthy();
    expect(screen.getByText("El curso sigue en progreso.")).toBeTruthy();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ answers: [0, 0, 0] }));
  });

  it("offers retry after a provider error", async () => {
    const requestQuiz = vi.fn().mockResolvedValueOnce({ ok: false, message: "Proveedor no disponible" }).mockResolvedValueOnce({ ok: true, data: quiz });
    render(<QuizDialog open target={target} onClose={() => undefined} requestQuizAction={requestQuiz} checkAnswerAction={vi.fn()} submitAttemptAction={vi.fn()} onCompleted={() => undefined} />);
    expect(await screen.findByText("Proveedor no disponible")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    await waitFor(() => expect(screen.getByText("Pregunta 1")).toBeTruthy());
  });

  it("identifies a ten-question course quiz", async () => {
    const courseQuiz = { ...quiz, kind: "course" as const, questions: Array.from({ length: 10 }, (_, index) => question(String(index + 1))) };
    render(<QuizDialog open target={{ ...target, kind: "course", chapterTitle: null }} onClose={() => undefined} requestQuizAction={vi.fn().mockResolvedValue({ ok: true, data: courseQuiz })} checkAnswerAction={vi.fn()} submitAttemptAction={vi.fn()} onCompleted={() => undefined} />);
    expect(await screen.findByText("10 preguntas del curso")).toBeTruthy();
  });
});

describe("QuizResult", () => {
  const base = { attemptId: "attempt-a", correctCount: 6, scorePercentage: 60, passed: true, streakCurrent: 1, streakBest: 1, streakIncreased: true, stepCompleted: true, nextStepId: "next" };

  it("celebrates a passed course and announces the next step", () => {
    render(<QuizResult kind="course" result={base} onClose={() => undefined} onRetry={() => undefined} />);
    expect(screen.getByText("Desbloqueaste el siguiente paso.")).toBeTruthy();
    expect(screen.getByAltText("Celebración por completar el quiz")).toBeTruthy();
  });

  it("offers another attempt after a failed result", () => {
    render(<QuizResult kind="course" result={{ ...base, passed: false, stepCompleted: false }} onClose={() => undefined} onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: "Reintentar quiz" })).toBeTruthy();
  });
});
