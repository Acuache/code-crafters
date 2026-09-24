"use server";

import { redirect } from "next/navigation";

import { assessmentAnswersSchema } from "@/components/quiz/quiz-schema";
import { adjustProfileFromFreeText } from "@/lib/ai/personalize-path";
import { loadCatalog } from "@/lib/catalog/catalog";
import { buildPath } from "@/lib/paths/build-path";
import type { BuiltStep, DiscardedStep } from "@/lib/paths/types";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

// El caso feliz no "devuelve" en el sentido normal: generatePath termina en
// redirect(`/paths/${id}`), que lanza NEXT_REDIRECT y hace que el cliente navegue en vez de recibir
// una resolución normal de la promesa (node_modules/next/dist/docs/.../functions/redirect.md). Este
// tipo sólo documenta la forma del caso de error: quien llama (quiz-form.tsx) nunca comprueba un
// `ok: true` porque ese camino nunca vuelve a su código.
export type GeneratePathResult = { ok: false; message: string };

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

// `assessmentId` es lo único que recibe la action: vuelve a leer las respuestas desde `assessments`
// (filtradas por RLS al dueño) en vez de confiar en un payload ya tipado del cliente — mismo patrón
// que ya usa saveAssessment (spec 06), y mitiga el riesgo de `assessments.answers` como jsonb sin
// versión.
export async function generatePath(assessmentId: string): Promise<GeneratePathResult> {
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

  // buildPath() (spec 04) no conoce `freeText`; el resto ya calza con LearnerProfile gracias a la
  // aserción de tipos que deja components/quiz/quiz-schema.ts.
  const { freeText, ...answeredProfile } = parsed.data;

  const { catalog, programs, courseIds, programIds } = await loadCatalog(supabase);

  // Sin este guard, un Supabase sin el seed del spec 02 aplicado produce una ruta de 0 pasos que
  // igual se guarda y redirige sin error — la forma de "no funciona al clonarlo" que
  // docs/ENUNCIADO.md descalifica.
  if (catalog.length === 0 || programs.length === 0) {
    return { ok: false, message: "El catálogo todavía no está cargado. Avisa al equipo." };
  }

  // Spec 11: con key y texto libre, la IA traduce ese texto a ajustes de meta, intereses y
  // tecnologías dominadas (nunca cursos), y el motor arma la ruta con eso. Sin key o ante
  // cualquier falla devuelve las respuestas tal cual. assessments.answers no se toca.
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
    // Compensación manual, no una función transaccional en Postgres: esa función sería una
    // migración nueva, prohibida por la regla 6 de docs/SPECS-MAP.md para este spec.
    await supabase.from("learning_paths").delete().eq("id", path.id);
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  redirect(`/paths/${path.id}`);
}
