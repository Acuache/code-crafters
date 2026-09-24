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

const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const FREE_FALLBACK_MODELS = ["google/gemma-4-31b-it:free", "openrouter/free"];

async function callOpenRouter(request: { questionCount: number; context: CourseQuizContext }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY en el servidor.");
  const openrouter = createOpenRouter({ apiKey });
  const configuredModel = process.env.OPENROUTER_MODEL;
  const models = configuredModel ? [configuredModel] : [DEFAULT_MODEL, ...FREE_FALLBACK_MODELS];
  let lastError: unknown;

  for (const model of models) {
    try {
      const { output } = await generateText({
        model: openrouter(model, {
          plugins: [{ id: "response-healing" }],
          provider: { allow_fallbacks: true, require_parameters: true },
        }),
        output: Output.object({ schema: generatedQuizSchema }),
        system: `Genera exactamente ${request.questionCount} preguntas educativas en español. Cada pregunta debe tener cuatro opciones distintas, una respuesta correcta y una explicación breve. Usa solamente el contenido proporcionado.`,
        prompt: JSON.stringify(request.context),
      });
      if (output) return output;
      lastError = new Error("El proveedor no generó una salida.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No se pudo generar el quiz.");
}

export async function generateQuiz(input: GenerateQuizInput, callModel: ModelCall = callOpenRouter): Promise<GeneratedQuiz> {
  if (input.kind === "chapter" && (!input.chapterTitle || !input.course.chapters.includes(input.chapterTitle))) {
    throw new Error("El capítulo no pertenece al curso seleccionado.");
  }
  const questionCount = input.kind === "chapter" ? 3 : 10;
  const context = { ...input.course, chapters: input.kind === "chapter" ? [input.chapterTitle!] : input.course.chapters };
  return parseGeneratedQuiz(await callModel({ questionCount, context }), input.kind);
}
