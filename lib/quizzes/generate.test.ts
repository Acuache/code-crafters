import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateQuiz } from "./generate";

const question = (id: string) => ({ id, prompt: `Pregunta ${id}`, options: ["A", "B", "C", "D"], correctOption: 0, explanation: "A" });
const course = {
  title: "TypeScript", summary: "Tipos seguros", topics: ["Tipos"], prerequisites: ["JavaScript"],
  outcomes: ["Tipar aplicaciones"], chapters: ["Introducción", "Genéricos"],
};

describe("generateQuiz", () => {
  it("sends only the selected course context", async () => {
    const callModel = vi.fn().mockResolvedValue({ questions: Array.from({ length: 10 }, (_, i) => question(String(i))) });
    await generateQuiz({ kind: "course", chapterTitle: null, course }, callModel);
    expect(callModel).toHaveBeenCalledWith(expect.objectContaining({
      questionCount: 10,
      context: { ...course, chapters: course.chapters },
    }));
    expect(JSON.stringify(callModel.mock.calls[0])).not.toContain("React");
  });

  it("rejects an unknown chapter before invoking the provider", async () => {
    const callModel = vi.fn();
    await expect(generateQuiz({ kind: "chapter", chapterTitle: "React", course }, callModel))
      .rejects.toThrow("El capítulo no pertenece al curso seleccionado.");
    expect(callModel).not.toHaveBeenCalled();
  });

  it("rejects invalid provider output", async () => {
    const callModel = vi.fn().mockResolvedValue({ questions: [question("1")] });
    await expect(generateQuiz({ kind: "chapter", chapterTitle: "Introducción", course }, callModel))
      .rejects.toThrow();
  });

  it("builds a valid deterministic quiz when every provider is unavailable", async () => {
    const unavailable = vi.fn().mockRejectedValue(new Error("Upstream unavailable"));
    const result = await generateQuiz({ kind: "course", chapterTitle: null, course }, unavailable);

    expect(result.questions).toHaveLength(10);
    expect(result.questions[0].prompt).toContain("TypeScript");
    expect(new Set(result.questions[0].options).size).toBe(4);
  });
});
