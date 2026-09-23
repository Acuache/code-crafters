import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";

import { generatedQuizSchema, parseGeneratedQuiz, type GeneratedQuiz, type QuizKind } from "./schema";

export type CourseQuizContext = {
  title: string; summary: string | null; topics: string[]; prerequisites: string[];
  outcomes: string[]; chapters: string[];
};
export type GenerateQuizInput = { kind: QuizKind; chapterTitle: string | null; course: CourseQuizContext };
export type ModelCall = (request: { questionCount: number; context: CourseQuizContext }) => Promise<unknown>;

async function callOpenRouter(request: { questionCount: number; context: CourseQuizContext }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY en el servidor.");
  const openrouter = createOpenRouter({ apiKey });
  const { output } = await generateText({
    model: openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini"),
    output: Output.object({ schema: generatedQuizSchema }),
    system: `Genera exactamente ${request.questionCount} preguntas educativas en español. Cada pregunta debe tener cuatro opciones distintas, una respuesta correcta y una explicación breve. Usa solamente el contenido proporcionado.`,
    prompt: JSON.stringify(request.context),
  });
  return output;
}

export async function generateQuiz(input: GenerateQuizInput, callModel: ModelCall = callOpenRouter): Promise<GeneratedQuiz> {
  if (input.kind === "chapter" && (!input.chapterTitle || !input.course.chapters.includes(input.chapterTitle))) {
    throw new Error("El capítulo no pertenece al curso seleccionado.");
  }
  const questionCount = input.kind === "chapter" ? 3 : 10;
  const context = { ...input.course, chapters: input.kind === "chapter" ? [input.chapterTitle!] : input.course.chapters };
  return parseGeneratedQuiz(await callModel({ questionCount, context }), input.kind);
}
