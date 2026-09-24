import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// generate.ts reusa el nombre del modelo de la personalización; el módulo real arrastra Supabase.
vi.mock("@/lib/ai/personalize-path", () => ({ PERSONALIZATION_MODEL: "test-model" }));

import { generateQuiz } from "./generate";

function makeQuestion(id: string) {
  return {
    id,
    prompt: `Pregunta ${id}`,
    options: ["A", "B", "C", "D"],
    correctOption: 0,
    explanation: "A",
  };
}

function makeQuiz(questionCount: number) {
  return {
    questions: Array.from({ length: questionCount }, (_, index) => makeQuestion(String(index + 1))),
  };
}

const course = {
  title: "TypeScript",
  summary: "Tipos seguros",
  topics: ["Tipos"],
  prerequisites: ["JavaScript"],
  outcomes: ["Tipar aplicaciones"],
  chapters: ["Introducción", "Genéricos"],
};

describe("generateQuiz", () => {
  it("pide 10 preguntas con todo el curso para un quiz de curso", async () => {
    const callModel = vi.fn().mockResolvedValue(makeQuiz(10));

    await generateQuiz({ kind: "course", chapterTitle: null, course }, callModel);

    expect(callModel).toHaveBeenCalledWith({ questionCount: 10, context: course });
  });

  it("pide 3 preguntas y solo el capítulo elegido para un quiz de capítulo", async () => {
    const callModel = vi.fn().mockResolvedValue(makeQuiz(3));

    await generateQuiz({ kind: "chapter", chapterTitle: "Genéricos", course }, callModel);

    expect(callModel).toHaveBeenCalledWith({
      questionCount: 3,
      context: { ...course, chapters: ["Genéricos"] },
    });
  });

  it("rechaza un capítulo que no es del curso sin llamar al modelo", async () => {
    const callModel = vi.fn();

    await expect(
      generateQuiz({ kind: "chapter", chapterTitle: "React", course }, callModel),
    ).rejects.toThrow("El capítulo no pertenece al curso seleccionado.");
    expect(callModel).not.toHaveBeenCalled();
  });

  it("rechaza una respuesta del modelo con otra cantidad de preguntas", async () => {
    const callModel = vi.fn().mockResolvedValue(makeQuiz(1));

    await expect(
      generateQuiz({ kind: "chapter", chapterTitle: "Introducción", course }, callModel),
    ).rejects.toThrow();
  });

  it("propaga el error del proveedor para que el quiz quede como fallido", async () => {
    const callModel = vi.fn().mockRejectedValue(new Error("Upstream unavailable"));

    await expect(
      generateQuiz({ kind: "course", chapterTitle: null, course }, callModel),
    ).rejects.toThrow("Upstream unavailable");
  });
});
