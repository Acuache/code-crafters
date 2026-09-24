import "server-only";

import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

import { PERSONALIZATION_MODEL } from "@/lib/ai/personalize-path";

import { parseGeneratedQuiz, QUESTION_COUNT, type GeneratedQuiz, type QuizKind } from "./schema";

export type CourseQuizContext = {
  title: string;
  summary: string | null;
  topics: string[];
  prerequisites: string[];
  outcomes: string[];
  chapters: string[];
};

export type GenerateQuizInput = {
  kind: QuizKind;
  chapterTitle: string | null;
  course: CourseQuizContext;
};

export type ModelRequest = { questionCount: number; context: CourseQuizContext };
export type ModelCall = (request: ModelRequest) => Promise<unknown>;

// Mismo modelo que la personalización (spec 11): una sola key de OpenAI para toda la app. Diez
// preguntas con explicación tardan más que una razón por paso, de ahí el timeout más largo.
const QUIZ_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 1;

// Lo que se le pide al modelo. Más simple que generatedQuizSchema (schema.ts) porque el modo
// estricto de OpenAI no acepta tuplas ni refinamientos: las cuatro opciones distintas y la
// cantidad exacta de preguntas se validan después, con parseGeneratedQuiz. Los ids los pone el
// código, no el modelo, para que nunca se repitan.
const modelQuizSchema = z.object({
  questions: z.array(
    z.object({
      prompt: z.string().describe("La pregunta, en español."),
      options: z.array(z.string()).describe("Exactamente cuatro opciones distintas."),
      correctOption: z.number().int().describe("Índice (0 a 3) de la opción correcta."),
      explanation: z
        .string()
        .describe("Por qué esa es la respuesta correcta, en una o dos frases."),
    }),
  ),
});

export function isQuizConfigured(): boolean {
  // La secret key hace falta para guardar el quiz compartido (lib/supabase/admin.ts).
  return Boolean(process.env.OPENAI_API_KEY && process.env.SUPABASE_SECRET_KEY);
}

async function callOpenAi({ questionCount, context }: ModelRequest): Promise<unknown> {
  const { output } = await generateText({
    model: openai(PERSONALIZATION_MODEL),
    providerOptions: {
      openai: { reasoningEffort: "low" } satisfies OpenAILanguageModelResponsesOptions,
    },
    maxRetries: MAX_RETRIES,
    abortSignal: AbortSignal.timeout(QUIZ_TIMEOUT_MS),
    instructions:
      `Generá exactamente ${questionCount} preguntas de opción múltiple en español para ` +
      "comprobar lo aprendido en un curso de programación. Cada pregunta tiene cuatro opciones " +
      "distintas, una sola correcta y una explicación breve. Usá solamente el contenido del curso " +
      "que te paso; no inventes temas que no aparecen ahí.",
    prompt: JSON.stringify(context),
    output: Output.object({ schema: modelQuizSchema }),
  });

  return withQuestionIds(output);
}

function withQuestionIds(output: z.infer<typeof modelQuizSchema>) {
  const questions = output.questions.map((question, index) => ({
    id: String(index + 1),
    ...question,
  }));

  return { questions };
}

// `callModel` se inyecta en los tests para no llamar a OpenAI.
export async function generateQuiz(
  input: GenerateQuizInput,
  callModel: ModelCall = callOpenAi,
): Promise<GeneratedQuiz> {
  const isChapterQuiz = input.kind === "chapter";

  if (isChapterQuiz && !isChapterOfCourse(input.chapterTitle, input.course)) {
    throw new Error("El capítulo no pertenece al curso seleccionado.");
  }

  // En un quiz de capítulo el modelo solo ve ese capítulo, para que no pregunte por el resto.
  const chapters =
    isChapterQuiz && input.chapterTitle ? [input.chapterTitle] : input.course.chapters;
  const context = { ...input.course, chapters };

  const rawQuiz = await callModel({ questionCount: QUESTION_COUNT[input.kind], context });
  return parseGeneratedQuiz(rawQuiz, input.kind);
}

function isChapterOfCourse(chapterTitle: string | null, course: CourseQuizContext): boolean {
  if (!chapterTitle) {
    return false;
  }

  return course.chapters.includes(chapterTitle);
}
