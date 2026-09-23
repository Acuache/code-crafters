"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { USER_DISCARD_REASON } from "@/lib/progress/path-progress";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export type StepActionResult = { ok: true } | { ok: false; message: string };

// `discarded` no es un estado válido acá: se entra a él sólo por discardStep, que exige `pending`.
const stepIdSchema = z.uuid();
const selectableStatusSchema = z.enum(["pending", "in_progress", "done"]);

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
    return { ok: false, message: "No se pudo guardar el cambio. Probá de nuevo." };
  }

  const updatedRow = updatedRows?.[0];
  if (!updatedRow) {
    return { ok: false, message: rejectionMessage };
  }

  revalidatePath(`/paths/${updatedRow.path_id}`);
  return { ok: true };
}

export async function setStepStatus(stepId: unknown, status: unknown): Promise<StepActionResult> {
  const parsedId = stepIdSchema.safeParse(stepId);
  const parsedStatus = selectableStatusSchema.safeParse(status);

  if (!parsedId.success || !parsedStatus.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  // completed_at es lo que va a leer el spec 13 para XP y racha: sólo tiene valor mientras el
  // paso está `done`, así que volver atrás lo limpia.
  const completedAt = parsedStatus.data === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: parsedStatus.data, completed_at: completedAt })
    .eq("id", parsedId.data)
    .neq("status", "discarded")
    .select("path_id");

  return finishStepUpdate(data, Boolean(error), "Este paso no se puede cambiar.");
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

  return finishStepUpdate(data, Boolean(error), "Sólo podés quitar pasos pendientes.");
}

export async function restoreStep(stepId: unknown): Promise<StepActionResult> {
  const parsedId = stepIdSchema.safeParse(stepId);

  if (!parsedId.success) {
    return INVALID_INPUT;
  }

  await requireUser();
  const supabase = await createClient();

  // Filtrar por USER_DISCARD_REASON es lo que impide restaurar un descarte del motor ("ya lo
  // dominás", "no cabía en tu tiempo"...): devolverlos rompería el presupuesto de horas.
  const { data, error } = await supabase
    .from("path_steps")
    .update({ status: "pending", discard_reason: null })
    .eq("id", parsedId.data)
    .eq("status", "discarded")
    .eq("discard_reason", USER_DISCARD_REASON)
    .select("path_id");

  return finishStepUpdate(data, Boolean(error), "Sólo podés restaurar los pasos que quitaste vos.");
}
