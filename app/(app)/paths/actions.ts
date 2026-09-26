"use server";

import { redirect } from "next/navigation";

import { assessmentAnswersSchema } from "@/components/quiz/quiz-schema";
import type { ActionFailure } from "@/lib/action-result";
import { adjustProfileFromFreeText } from "@/lib/ai/personalize-path";
import { loadCatalog } from "@/lib/catalog/catalog";
import { buildPath } from "@/lib/paths/build-path";
import type { BuiltStep, DiscardedStep } from "@/lib/paths/types";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

const GENERIC_ERROR_MESSAGE = "No pudimos generar tu ruta. Prueba de nuevo.";

function toStepRow(
  pathId: string,
  step: BuiltStep | DiscardedStep,
  courseIds: Record<string, number>,
  programIds: Record<string, number>,
): TablesInsert<"path_steps"> {
  return {
    path_id: pathId,
    course_id: courseIds[step.courseSlug],
    source_program_id: step.sourceProgramSlug ? programIds[step.sourceProgramSlug] : null,
    stage: step.stage,
    position: step.position,
    origin: step.origin,
    reason: step.reason,
    status: "pending",
  };
}

// Recibe solo el id y vuelve a leer las respuestas de la base (RLS filtra al dueño) en vez de
// confiar en lo que mande el cliente. Solo devuelve cuando falla: con éxito termina en redirect().
export async function generatePath(assessmentId: string): Promise<ActionFailure> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("answers")
    .eq("id", assessmentId)
    .single();

  if (assessmentError || !assessment) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const parsed = assessmentAnswersSchema.safeParse(assessment.answers);
  if (!parsed.success) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  // El motor no usa `freeText`; el resto ya tiene la forma de LearnerProfile.
  const { freeText, ...answeredProfile } = parsed.data;

  const { catalog, programs, courseIds, programIds } = await loadCatalog(supabase);

  // Sin el seed del catálogo se guardaría una ruta vacía sin ningún error.
  if (catalog.length === 0 || programs.length === 0) {
    return { ok: false, message: "El catálogo todavía no está cargado. Avisa al equipo." };
  }

  // La IA traduce el texto libre a ajustes de meta, intereses y tecnologías (nunca cursos). Sin
  // key o ante cualquier falla, las respuestas quedan tal cual.
  const { profile, applied: aiAdjustments } = await adjustProfileFromFreeText(
    supabase,
    answeredProfile,
    freeText,
  );

  const built = buildPath(profile, catalog, programs);

  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .insert({
      user_id: user.userId,
      assessment_id: assessmentId,
      title: built.title,
      goal: built.goal,
      summary: built.summary,
      budget_hours: built.budgetHours,
      ai_adjustments: aiAdjustments,
    })
    .select("id")
    .single();

  if (pathError || !path) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const stepRows: TablesInsert<"path_steps">[] = [
    ...built.steps.map((step) => toStepRow(path.id, step, courseIds, programIds)),
    ...built.discarded.map((step) => ({
      ...toStepRow(path.id, step, courseIds, programIds),
      status: "discarded" as const,
      discard_reason: step.discardReason,
    })),
  ];

  const { error: stepsError } = await supabase.from("path_steps").insert(stepRows);

  if (stepsError) {
    // Sin transacción entre los dos inserts: si fallan los pasos, se borra la ruta a mano.
    await supabase.from("learning_paths").delete().eq("id", path.id);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  redirect(`/paths/${path.id}`);
}
