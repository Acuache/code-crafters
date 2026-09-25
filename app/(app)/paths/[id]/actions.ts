"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult, ActionResultWithData } from "@/lib/action-result";
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
): Promise<ActionResult> {
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
export type AttemptResult = z.infer<typeof attemptResultSchema>;

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
