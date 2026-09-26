import { describe, expect, it } from "vitest";

import {
  courseQuizDraftSchema,
  courseQuizFormSchema,
  MAX_QUIZ_QUESTIONS,
  quizQuestionSchema,
} from "./schema";

const makeQuestion = (id: string) => ({
  id,
  prompt: `Pregunta ${id}`,
  options: ["Opción A", "Opción B", "Opción C", "Opción D"],
  correctOption: 0,
  explanation: "La opción A es la respuesta correcta.",
});

const makeForm = (questionCount: number) => ({
  questions: Array.from({ length: questionCount }, (_, index) => makeQuestion(String(index + 1))),
  passPercentage: 60,
  isActive: true,
});

describe("quizQuestionSchema", () => {
  it("accepts a valid question", () => {
    expect(quizQuestionSchema.safeParse(makeQuestion("1")).success).toBe(true);
  });

  it("trims the texts it accepts", () => {
    const parsed = quizQuestionSchema.parse({ ...makeQuestion("1"), prompt: "  ¿Qué es Git?  " });
    expect(parsed.prompt).toBe("¿Qué es Git?");
  });

  it("rejects duplicate answer options", () => {
    const question = { ...makeQuestion("1"), options: ["Igual", "Igual", "C", "D"] };
    const result = quizQuestionSchema.safeParse(question);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Las cuatro opciones deben ser distintas.");
  });

  it.each([
    [{ ...makeQuestion("1"), prompt: " " }, "prompt en blanco"],
    [{ ...makeQuestion("1"), prompt: "p".repeat(501) }, "prompt demasiado largo"],
    [{ ...makeQuestion("1"), options: ["A", "B", "C"] }, "tres opciones"],
    [{ ...makeQuestion("1"), options: ["A", "B", "C", " "] }, "opción en blanco"],
    [{ ...makeQuestion("1"), correctOption: 4 }, "índice fuera de rango"],
    [{ ...makeQuestion("1"), explanation: " " }, "explicación en blanco"],
    [{ ...makeQuestion("1"), explanation: "e".repeat(501) }, "explicación demasiado larga"],
    [{ ...makeQuestion(""), prompt: "Sin id" }, "id vacío"],
  ])("rejects a question with %s", (invalidQuestion) => {
    expect(quizQuestionSchema.safeParse(invalidQuestion).success).toBe(false);
  });
});

describe("courseQuizFormSchema", () => {
  it("accepts between 1 and the maximum number of questions", () => {
    expect(courseQuizFormSchema.safeParse(makeForm(1)).success).toBe(true);
    expect(courseQuizFormSchema.safeParse(makeForm(MAX_QUIZ_QUESTIONS)).success).toBe(true);
  });

  it("rejects an empty quiz and one over the maximum", () => {
    expect(courseQuizFormSchema.safeParse(makeForm(0)).success).toBe(false);
    expect(courseQuizFormSchema.safeParse(makeForm(MAX_QUIZ_QUESTIONS + 1)).success).toBe(false);
  });

  it.each([0, 101, 60.5])("rejects a pass percentage of %s", (passPercentage) => {
    expect(courseQuizFormSchema.safeParse({ ...makeForm(3), passPercentage }).success).toBe(false);
  });
});

describe("courseQuizDraftSchema", () => {
  it("accepts a new question without id, which the saved quiz would reject", () => {
    const draft = { ...makeForm(1), questions: [makeQuestion("")] };

    expect(courseQuizDraftSchema.safeParse(draft).success).toBe(true);
    expect(courseQuizFormSchema.safeParse(draft).success).toBe(false);
  });

  it("keeps every other rule of a saved quiz", () => {
    const draft = { ...makeForm(1), questions: [{ ...makeQuestion(""), prompt: " " }] };

    expect(courseQuizDraftSchema.safeParse(draft).success).toBe(false);
  });
});
