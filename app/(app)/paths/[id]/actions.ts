"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateQuiz } from "@/lib/quizzes/generate";
import { createSupabaseQuizStore, getOrCreateQuiz, toSafeQuiz } from "@/lib/quizzes/repository";
import type { QuizKind, SafeQuiz } from "@/lib/quizzes/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };
export type AttemptResult = {
  attemptId: string; correctCount: number; scorePercentage: number; passed: boolean;
  streakCurrent: number; streakBest: number; streakIncreased: boolean;
  stepCompleted: boolean; nextStepId: string | null;
};

const uuid = z.string().uuid();
const attemptInputSchema = z.object({
  quizId: uuid, pathId: uuid, pathStepId: uuid,
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(10),
  timezone: z.string().max(100), idempotencyKey: uuid,
});
export const validateAttemptInput = (input: unknown) => attemptInputSchema.safeParse(input);

export function normalizeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

function isStoredQuestion(value: Json): value is { [key: string]: Json | undefined } & {
  id: string; correctOption: number; explanation: string;
} {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && typeof value.id === "string"
    && typeof value.correctOption === "number"
    && typeof value.explanation === "string";
}

type TargetInput = { pathId: string; pathStepId: string; kind: QuizKind; chapterTitle: string | null };

async function loadOwnedTarget(input: TargetInput, userId: string) {
  const supabase = await createClient();
  const { data: step } = await supabase.from("path_steps")
    .select("id, path_id, course_id, origin, status, stage, position, courses(id, title, summary, topics, prerequisites, outcomes, chapters)")
    .eq("id", input.pathStepId).eq("path_id", input.pathId).single();
  const { data: path } = await supabase.from("learning_paths").select("id").eq("id", input.pathId).eq("user_id", userId).maybeSingle();
  if (!step || !path || step.status === "discarded") throw new Error("NOT_FOUND");
  return { supabase, step };
}

export async function requestQuiz(input: TargetInput): Promise<ActionResult<SafeQuiz>> {
  try {
    const user = await requireUser();
    const { supabase, step } = await loadOwnedTarget(input, user.userId);
    const course = step.courses;
    if (input.kind === "course" && step.origin !== "opcional" && step.status === "pending") {
      const { data: prior } = await supabase.from("path_steps").select("id").eq("path_id", input.pathId)
        .not("status", "in", '("done","discarded")').or(`stage.lt.${step.stage},and(stage.eq.${step.stage},position.lt.${step.position})`).limit(1);
      if (prior?.length) return { ok: false, message: "Completá el paso anterior para continuar." };
      await supabase.from("path_steps").update({ status: "in_progress" }).eq("id", step.id);
    }
    const targetKey = input.kind === "course" ? `course:${course.id}` :
      `chapter:${course.id}:${createHash("sha256").update(input.chapterTitle ?? "").digest("hex")}`;
    const admin = createAdminClient();
    const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
    const record = await getOrCreateQuiz({ targetKey, title: input.chapterTitle ?? course.title, kind: input.kind }, {
      store: createSupabaseQuizStore(admin, { courseId: course.id, chapterTitle: input.chapterTitle, model }),
      generate: () => generateQuiz({ kind: input.kind, chapterTitle: input.chapterTitle, course }),
    });
    return { ok: true, data: toSafeQuiz(record) };
  } catch (error) {
    console.error("No se pudo preparar el quiz", error);
    return { ok: false, message: "No pudimos preparar el quiz. Intentá de nuevo." };
  }
}

export async function checkQuizAnswer(input: { quizId: string; questionId: string; selectedOption: number }): Promise<ActionResult<{ correct: boolean; explanation: string }>> {
  const user = await requireUser();
  if (!uuid.safeParse(input.quizId).success || !Number.isInteger(input.selectedOption) || input.selectedOption < 0 || input.selectedOption > 3) return { ok: false, message: "La respuesta no es válida." };
  const admin = createAdminClient();
  const { data: quiz } = await admin.from("quizzes").select("course_id, questions").eq("id", input.quizId).eq("status", "ready").single();
  const supabase = await createClient();
  const { data: owned } = quiz ? await supabase.from("path_steps").select("id, learning_paths!inner(user_id)").eq("course_id", quiz.course_id).eq("learning_paths.user_id", user.userId).limit(1) : { data: null };
  if (!quiz || !owned?.length || !Array.isArray(quiz.questions)) return { ok: false, message: "Quiz no disponible." };
  const question = (quiz.questions as Json[]).find((item) => isStoredQuestion(item) && item.id === input.questionId);
  if (!question || !isStoredQuestion(question)) return { ok: false, message: "Pregunta no disponible." };
  return { ok: true, data: { correct: question.correctOption === input.selectedOption, explanation: question.explanation } };
}

export async function submitQuizAttempt(input: unknown): Promise<ActionResult<AttemptResult>> {
  await requireUser();
  const parsed = validateAttemptInput(input);
  if (!parsed.success) return { ok: false, message: "Las respuestas no son válidas." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: parsed.data.quizId, p_path_id: parsed.data.pathId, p_path_step_id: parsed.data.pathStepId,
    p_answers: parsed.data.answers, p_timezone: normalizeTimezone(parsed.data.timezone), p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error || !data) return { ok: false, message: "No pudimos guardar el intento." };
  revalidatePath(`/paths/${parsed.data.pathId}`);
  return { ok: true, data: data as unknown as AttemptResult };
}

export async function updateTimezone(timezone: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const { error } = await createAdminClient().from("profiles").update({ timezone: normalizeTimezone(timezone) }).eq("id", user.userId);
  return error ? { ok: false, message: "No pudimos guardar tu zona horaria." } : { ok: true, data: null };
}
