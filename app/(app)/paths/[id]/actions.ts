"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult, ActionResultWithData } from "@/lib/action-result";
import { loadGamificationInput } from "@/lib/gamification/load-gamification";
import { todayInTimeZone } from "@/lib/gamification/streak";
import {
  celebrateStepChange,
  type CelebrationEvents,
  type GamificationInput,
} from "@/lib/gamification/summary";
import { USER_DISCARD_REASON } from "@/lib/progress/path-progress";
import { validateAttemptInput } from "@/lib/quizzes/action-validation";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

// `discarded` no es un estado válido acá: se entra a él sólo por discardStep, que exige `pending`.
const stepIdSchema = z.uuid();
const selectableStatusSchema = z.enum(["pending", "in_progress", "done"]);
// Postgres valida la zona y cae a UTC si no existe.
const timeZoneSchema = z.string().min(1).max(64);

const INVALID_INPUT: ActionFailure = { ok: false, message: "El paso no es válido." };
const SAVE_FAILED: ActionFailure = {
  ok: false,
  message: "No se pudo guardar el cambio. Prueba de nuevo.",
};

// Las tres actions son endpoints públicos: las reglas de transición viven en los filtros del
// `update`, no en qué botones muestra la UI. RLS (`path_steps_owner_all`) ya descarta los pasos de
// otro usuario, así que cero filas actualizadas cubre a la vez "ajeno", "inexistente" y
// "transición no permitida".
async function finishStepUpdate(
  updatedRows: { path_id: string }[] | null,
  hasError: boolean,
  rejectionMessage: string,
): Promise<ActionResult> {
  if (hasError) {
    return SAVE_FAILED;
  }

  const updatedRow = updatedRows?.[0];
  if (!updatedRow) {
    return { ok: false, message: rejectionMessage };
  }

  revalidatePath(`/paths/${updatedRow.path_id}`);
  return { ok: true };
}

export type StepStatusResult = { ok: true; gamification?: CelebrationEvents } | ActionFailure;

export async function setStepStatus(
  stepId: unknown,
  status: unknown,
  timeZone: unknown,
): Promise<StepStatusResult> {
  const parsedId = stepIdSchema.safeParse(stepId);
  const parsedStatus = selectableStatusSchema.safeParse(status);
  const parsedTimeZone = timeZoneSchema.safeParse(timeZone);

  if (!parsedId.success || !parsedStatus.success || !parsedTimeZone.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  // ADR 0007: un curso con quiz activo se completa aprobándolo.
  if (parsedStatus.data === "done") {
    const hasActiveQuiz = await courseOfStepHasActiveQuiz(supabase, parsedId.data);
    if (hasActiveQuiz === null) {
      return SAVE_FAILED;
    }

    if (hasActiveQuiz) {
      return { ok: false, message: "Este curso se completa aprobando su quiz." };
    }
  }

  // Volver a "Pendiente" no suma racha ni se celebra.
  const progressStatus = parsedStatus.data === "pending" ? null : parsedStatus.data;

  // El "después" se arma en memoria a partir de este "antes".
  const gamificationBefore = progressStatus
    ? await loadGamificationBefore(supabase, todayInTimeZone(parsedTimeZone.data))
    : null;

  // completed_at sólo tiene valor mientras el paso está `done`, así que volver atrás lo limpia.
  const completedAt = parsedStatus.data === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: parsedStatus.data, completed_at: completedAt })
    .eq("id", parsedId.data)
    .neq("status", "discarded")
    .select("path_id");

  const result = await finishStepUpdate(data, Boolean(error), "Este paso no se puede cambiar.");
  const updatedPathId = data?.[0]?.path_id;

  if (!result.ok || !progressStatus || !updatedPathId) {
    return result;
  }

  const recordedActivityDay = await recordStreakDay(supabase, parsedId.data, parsedTimeZone.data);

  if (!gamificationBefore) {
    return result;
  }

  const gamification = celebrateStepChange(gamificationBefore, {
    pathId: updatedPathId,
    stepId: parsedId.data,
    status: progressStatus,
    recordedActivityDay,
  });

  return { ok: true, gamification };
}

// null si no se pudo leer. is_active porque la RLS le muestra los desactivados al admin.
async function courseOfStepHasActiveQuiz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepId: string,
): Promise<boolean | null> {
  const { data: step, error: stepError } = await supabase
    .from("path_steps")
    .select("course_id")
    .eq("id", stepId)
    .maybeSingle();

  if (stepError) {
    console.error(`[quiz] courseOfStepHasActiveQuiz: ${stepError.message}`);
    return null;
  }

  if (!step) {
    return false;
  }

  const { count, error: quizError } = await supabase
    .from("quizzes")
    .select("id", { count: "exact", head: true })
    .eq("course_id", step.course_id)
    .eq("is_active", true);

  if (quizError) {
    console.error(`[quiz] courseOfStepHasActiveQuiz: ${quizError.message}`);
    return null;
  }

  return (count ?? 0) > 0;
}

// Si la racha falla, el paso igual queda guardado. Devuelve si hoy quedó registrado.
async function recordStreakDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepId: string,
  timeZone: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("record_step_activity", {
    p_step_id: stepId,
    p_time_zone: timeZone,
  });

  if (error) {
    console.error(`[streak] record_step_activity: ${error.message}`);
    return false;
  }

  return true;
}

// La gamificación nunca rompe el cambio: sin el "antes", solo no hay celebración.
async function loadGamificationBefore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  today: string,
): Promise<GamificationInput | null> {
  try {
    return await loadGamificationInput(supabase, today);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[gamification] loadGamificationInput: ${message}`);
    return null;
  }
}

export async function discardStep(stepId: unknown): Promise<ActionResult> {
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

export async function restoreStep(stepId: unknown): Promise<ActionResult> {
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
// Opcional para no tocar los fixtures de quiz-dialog.test.tsx.
export type AttemptResult = z.infer<typeof attemptResultSchema> & {
  gamification?: CelebrationEvents;
};

// Vuelve a corregir en Postgres (el diálogo ya mostró el feedback con las respuestas del quiz),
// guarda el intento y, si aprobó, suma la racha y marca el paso como hecho.
export async function submitQuizAttempt(
  input: unknown,
): Promise<ActionResultWithData<AttemptResult>> {
  const parsed = validateAttemptInput(input);
  if (!parsed.success) {
    return { ok: false, message: "Las respuestas no son válidas." };
  }

  await requireUser();
  const supabase = await createClient();

  const gamificationBefore = await loadGamificationBefore(
    supabase,
    todayInTimeZone(parsed.data.timezone),
  );

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

  if (!attempt.data.passed || !gamificationBefore) {
    return { ok: true, data: attempt.data };
  }

  // El RPC ya marcó el paso y registró el día.
  const gamification = celebrateStepChange(gamificationBefore, {
    pathId: parsed.data.pathId,
    stepId: parsed.data.pathStepId,
    status: "done",
    recordedActivityDay: true,
  });

  return { ok: true, data: { ...attempt.data, gamification } };
}
