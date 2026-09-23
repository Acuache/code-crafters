import { describe, expect, it } from "vitest";

import { generatedQuizSchema, parseGeneratedQuiz } from "./schema";

const makeQuestion = (id: string) => ({
  id,
  prompt: `Pregunta ${id}`,
  options: ["Opción A", "Opción B", "Opción C", "Opción D"],
  correctOption: 0,
  explanation: "La opción A es la respuesta correcta.",
});

describe("generatedQuizSchema", () => {
  it("accepts a valid generated course quiz", () => {
    const validCourseQuiz = {
      questions: Array.from({ length: 10 }, (_, index) => makeQuestion(String(index + 1))),
    };

    expect(generatedQuizSchema.safeParse(validCourseQuiz).success).toBe(true);
  });

  it("rejects a generated quiz with fewer than three questions", () => {
    const validCourseQuiz = {
      questions: Array.from({ length: 10 }, (_, index) => makeQuestion(String(index + 1))),
    };

    expect(
      generatedQuizSchema.safeParse({ questions: validCourseQuiz.questions.slice(0, 2) }).success,
    ).toBe(false);
  });

  it("rejects duplicate answer options", () => {
    const quizWithDuplicateOptions = {
      questions: [
        { ...makeQuestion("1"), options: ["Igual", "Igual", "C", "D"] },
        makeQuestion("2"),
        makeQuestion("3"),
      ],
    };

    expect(generatedQuizSchema.safeParse(quizWithDuplicateOptions).success).toBe(false);
  });

  it("enforces the question count for each quiz kind", () => {
    const chapterQuiz = { questions: [makeQuestion("1"), makeQuestion("2"), makeQuestion("3")] };

    expect(parseGeneratedQuiz(chapterQuiz, "chapter")).toEqual(chapterQuiz);
    expect(() => parseGeneratedQuiz(chapterQuiz, "course")).toThrow(
      "El quiz de curso debe tener exactamente 10 preguntas.",
    );
  });

  it.each([
    [{ ...makeQuestion("1"), prompt: " " }, "prompt en blanco"],
    [{ ...makeQuestion("1"), prompt: "p".repeat(501) }, "prompt demasiado largo"],
    [{ ...makeQuestion("1"), correctOption: 4 }, "índice fuera de rango"],
    [{ ...makeQuestion("1"), explanation: " " }, "explicación en blanco"],
    [{ ...makeQuestion("1"), explanation: "e".repeat(501) }, "explicación demasiado larga"],
  ])("rejects a question with %s", (invalidQuestion) => {
    const quiz = { questions: [invalidQuestion, makeQuestion("2"), makeQuestion("3")] };
    expect(generatedQuizSchema.safeParse(quiz).success).toBe(false);
  });
});
