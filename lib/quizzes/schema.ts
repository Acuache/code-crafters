import { z } from "zod";

export type QuizKind = "course" | "chapter";

const nonBlankText = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const optionsSchema = z
  .tuple([
    nonBlankText(240),
    nonBlankText(240),
    nonBlankText(240),
    nonBlankText(240),
  ])
  .refine((options) => new Set(options).size === options.length, {
    message: "Las cuatro opciones deben ser distintas.",
  });

export const generatedQuizQuestionSchema = z.object({
  id: nonBlankText(100),
  prompt: nonBlankText(500),
  options: optionsSchema,
  correctOption: z.number().int().min(0).max(3),
  explanation: nonBlankText(500),
});

export const generatedQuizSchema = z.object({
  questions: z.array(generatedQuizQuestionSchema).min(3).max(10),
});

export type QuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
export type SafeQuizQuestion = Omit<QuizQuestion, "correctOption" | "explanation">;

export type SafeQuiz = {
  id: string;
  title: string;
  kind: QuizKind;
  passPercentage: number;
  questions: SafeQuizQuestion[];
};

const QUESTION_COUNT: Record<QuizKind, number> = {
  chapter: 3,
  course: 10,
};

export function parseGeneratedQuiz(value: unknown, kind: QuizKind): GeneratedQuiz {
  const quiz = generatedQuizSchema.parse(value);
  const expectedCount = QUESTION_COUNT[kind];

  if (quiz.questions.length !== expectedCount) {
    const kindLabel = kind === "course" ? "curso" : "capítulo";
    throw new Error(`El quiz de ${kindLabel} debe tener exactamente ${expectedCount} preguntas.`);
  }

  return quiz;
}
