"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERSONALIZATION_MODEL } from "@/lib/ai/personalize-path";
import { USER_DISCARD_REASON } from "@/lib/progress/path-progress";
import { quizTargetSchema, validateAttemptInput } from "@/lib/quizzes/action-validation";
import { generateQuiz, isQuizConfigured } from "@/lib/quizzes/generate";
import { createSupabaseQuizStore, getOrCreateQuiz, toSafeQuiz } from "@/lib/quizzes/repository";
import type { SafeQuiz } from "@/lib/quizzes/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export type StepActionResult = { ok: true } | { ok: false; message: string };

// `discarded` no es un estado válido acá: se entra a él sólo por discardStep, que exige `pending`.
const stepIdSchema = z.uuid();
const selectableStatusSchema = z.enum(["pending", "in_progress", "done"]);
// Postgres valida la zona y cae a UTC si no existe.
const timeZoneSchema = z.string().min(1).max(64);

const INVALID_INPUT: StepActionResult = { ok: false, message: "El paso no es válido." };

// Las tres actions son endpoints públicos: las reglas de transición viven en los filtros del
// `update`, no en qué botones muestra la UI. RLS (`path_steps_owner_all`) ya descarta los pasos de
// otro usuario, así que cero filas actualizadas cubre a la vez "ajeno", "inexistente" y
// "transición no permitida".
async function finishStepUpdate(
  updatedRows: { path_id: string }[] | null,
  hasError: boolean,
  rejectionMessage: string,
): Promise<StepActionResult> {
  if (hasError) {
    return { ok: false, message: "No se pudo guardar el cambio. Prueba de nuevo." };
  }

  const updatedRow = updatedRows?.[0];
  if (!updatedRow) {
    return { ok: false, message: rejectionMessage };
  }

  revalidatePath(`/paths/${updatedRow.path_id}`);
  return { ok: true };
}

export async function setStepStatus(
  stepId: unknown,
  status: unknown,
  timeZone: unknown,
): Promise<StepActionResult> {
  const parsedId = stepIdSchema.safeParse(stepId);
  const parsedStatus = selectableStatusSchema.safeParse(status);
  const parsedTimeZone = timeZoneSchema.safeParse(timeZone);

  if (!parsedId.success || !parsedStatus.success || !parsedTimeZone.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  // completed_at sólo tiene valor mientras el paso está `done`, así que volver atrás lo limpia.
  const completedAt = parsedStatus.data === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: parsedStatus.data, completed_at: completedAt })
    .eq("id", parsedId.data)
    .neq("status", "discarded")
    .select("path_id");

  const result = await finishStepUpdate(data, Boolean(error), "Este paso no se puede cambiar.");

  const isProgress = parsedStatus.data === "in_progress" || parsedStatus.data === "done";
  if (result.ok && isProgress) {
    await recordStreakDay(supabase, parsedId.data, parsedTimeZone.data);
  }

  return result;
}

// Si la racha falla, el paso igual queda guardado.
async function recordStreakDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepId: string,
  timeZone: string,
): Promise<void> {
  const { error } = await supabase.rpc("record_step_activity", {
    p_step_id: stepId,
    p_time_zone: timeZone,
  });

  if (error) {
    console.error(`[streak] record_step_activity: ${error.message}`);
  }
}

export async function discardStep(stepId: unknown): Promise<StepActionResult> {
  const parsedId = stepIdSchema.safeParse(stepId);

  if (!parsedId.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: "discarded", discard_reason: USER_DISCARD_REASON, completed_at: null })
    .eq("id", parsedId.data)
    .eq("status", "pending")
    .select("path_id");

  return finishStepUpdate(data, Boolean(error), "Solo puedes quitar pasos pendientes.");
}

export async function restoreStep(stepId: unknown): Promise<StepActionResult> {
  const parsedId = stepIdSchema.safeParse(stepId);

  if (!parsedId.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  // Filtrar por USER_DISCARD_REASON es lo que impide restaurar un descarte del motor ("ya lo
  // dominas", "no cabía en tu tiempo"...): devolverlos rompería el presupuesto de horas.
  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: "pending", discard_reason: null })
    .eq("id", parsedId.data)
    .eq("status", "discarded")
    .eq("discard_reason", USER_DISCARD_REASON)
    .select("path_id");

  return finishStepUpdate(data, Boolean(error), "Solo puedes restaurar los pasos que quitaste tú.");
}

export type QuizActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const QUIZ_UNAVAILABLE = "No pudimos preparar el quiz. Prueba de nuevo en un rato.";

// Pide el quiz compartido del curso o del capítulo, o lo genera si todavía no existe. Nunca lanza:
// cualquier falla (sin key, OpenAI caído, paso ajeno) vuelve como mensaje.
export async function requestQuiz(target: unknown): Promise<QuizActionResult<SafeQuiz>> {
  const parsedTarget = quizTargetSchema.safeParse(target);
  if (!parsedTarget.success || !isQuizConfigured()) {
    return { ok: false, message: QUIZ_UNAVAILABLE };
  }

  const { pathId, pathStepId, kind, chapterTitle } = parsedTarget.data;

  try {
    await requireUser();
    const supabase = await createClient();

    // RLS (`path_steps_owner_all`) solo devuelve pasos de rutas propias.
    const { data: step } = await supabase
      .from("path_steps")
      .select("status, courses(id, title, summary, topics, prerequisites, outcomes, chapters)")
      .eq("id", pathStepId)
      .eq("path_id", pathId)
      .maybeSingle();

    if (!step || step.status === "discarded") {
      return { ok: false, message: "Este paso no tiene quiz disponible." };
    }

    const course = step.courses;
    const quizChapter = kind === "chapter" ? chapterTitle : null;

    const record = await getOrCreateQuiz(
      {
        targetKey: buildTargetKey(course.id, quizChapter),
        title: quizChapter ?? course.title,
        kind,
      },
      {
        store: createSupabaseQuizStore(createAdminClient(), {
          courseId: course.id,
          chapterTitle: quizChapter,
          model: PERSONALIZATION_MODEL,
        }),
        generate: () => generateQuiz({ kind, chapterTitle: quizChapter, course }),
      },
    );

    return { ok: true, data: toSafeQuiz(record) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[quiz] requestQuiz: ${message}`);
    return { ok: false, message: QUIZ_UNAVAILABLE };
  }
}

// Identifica el quiz compartido sin depender de NULL en un índice único. El título del capítulo
// va hasheado porque puede ser largo y tener cualquier carácter.
function buildTargetKey(courseId: number, chapterTitle: string | null): string {
  if (!chapterTitle) {
    return `course:${courseId}`;
  }

  const chapterHash = createHash("sha256").update(chapterTitle).digest("hex");
  return `chapter:${courseId}:${chapterHash}`;
}

const questionResultSchema = z.object({
  questionId: z.string(),
  selectedOption: z.number(),
  correctOption: z.number(),
  correct: z.boolean(),
  explanation: z.string(),
});

// El RPC devuelve `Json` sin tipo: se valida en vez de castear.
const attemptResultSchema = z.object({
  attemptId: z.uuid(),
  correctCount: z.number(),
  scorePercentage: z.number(),
  passed: z.boolean(),
  streakIncreased: z.boolean(),
  stepCompleted: z.boolean(),
  results: z.array(questionResultSchema),
});

export type QuizQuestionResult = z.infer<typeof questionResultSchema>;
export type AttemptResult = z.infer<typeof attemptResultSchema>;

// Corrige en Postgres, guarda el intento, suma la racha si aprobó y, si es el quiz del curso,
// marca el paso como hecho. La corrección por pregunta llega recién acá, nunca antes.
export async function submitQuizAttempt(input: unknown): Promise<QuizActionResult<AttemptResult>> {
  const parsed = validateAttemptInput(input);
  if (!parsed.success) {
    return { ok: false, message: "Las respuestas no son válidas." };
  }

  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: parsed.data.quizId,
    p_path_id: parsed.data.pathId,
    p_path_step_id: parsed.data.pathStepId,
    p_answers: parsed.data.answers,
    p_timezone: parsed.data.timezone,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  const attempt = attemptResultSchema.safeParse(data);
  if (error || !attempt.success) {
    console.error(`[quiz] submit_quiz_attempt: ${error?.message ?? "respuesta inválida"}`);
    return { ok: false, message: "No pudimos guardar tu intento. Prueba de nuevo." };
  }

  revalidatePath(`/paths/${parsed.data.pathId}`);
  return { ok: true, data: attempt.data };
}
