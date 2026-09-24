"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assessmentAnswersSchema } from "@/components/quiz/quiz-schema";
import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES } from "@/lib/paths/interests";
import type { StepOrigin } from "@/lib/paths/types";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

import type { LearnerContext, PersonalizationStep } from "./build-prompt";
import { remainingPersonalizations } from "./daily-limit";
import {
  countPersonalizationsInLast24h,
  isAiConfigured,
  requestPersonalization,
} from "./personalize-path";
import type { Personalization } from "./personalization-schema";

export type PersonalizePathResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "limit_reached" | "failed" | "not_found" };

const pathIdSchema = z.uuid();

const STEP_ORIGINS: readonly StepOrigin[] = ["requerido", "recomendado", "opcional", "interes"];

// `path_steps.origin` es `text` (spec 02). Un valor desconocido no rompe la personalización: el
// paso se trata como opcional, porque acá solo sirve de contexto para redactar.
function toStepOrigin(value: string): StepOrigin {
  return STEP_ORIGINS.find((knownOrigin) => knownOrigin === value) ?? "opcional";
}

// Las respuestas guardadas usan slugs; la IA recibe los nombres que ve el usuario. Si un slug ya
// no existe en las tablas del motor, se usa el slug tal cual en vez de perder el dato.
function toLearnerContext(answers: unknown): LearnerContext | null {
  const parsed = assessmentAnswersSchema.safeParse(answers);
  if (!parsed.success) {
    return null;
  }

  const profile = parsed.data;
  return {
    goalLabel: GOALS[profile.goal]?.label ?? profile.goal,
    level: profile.level,
    masteredTechnologies: profile.masteredTechnologies.map(
      (technology) => TECHNOLOGIES[technology]?.label ?? technology,
    ),
    interests: profile.interests.map((interest) => INTERESTS[interest]?.label ?? interest),
    hoursPerWeek: profile.hoursPerWeek,
    deadlineMonths: profile.deadlineMonths,
  };
}

function readFreeText(answers: unknown): string {
  const parsed = assessmentAnswersSchema.safeParse(answers);
  return parsed.success ? parsed.data.freeText : "";
}

// Si el modelo nombra dos veces el mismo curso, gana la última razón (spec 11). Se resuelve acá
// y no en SQL: un UPDATE ... FROM con dos filas para el mismo paso elige una al azar.
function keepLastReasonPerCourse(reasons: Personalization["reasons"]): Personalization["reasons"] {
  const reasonByCourse = new Map<string, string>();
  for (const { courseSlug, reason } of reasons) {
    reasonByCourse.set(courseSlug, reason);
  }

  return Array.from(reasonByCourse, ([courseSlug, reason]) => ({ courseSlug, reason }));
}

// Endpoint público como cualquier server action: el límite y la propiedad de la ruta se validan
// acá y en la RLS, no en qué botones muestra la UI.
export async function personalizePath(pathId: unknown): Promise<PersonalizePathResult> {
  const parsedId = pathIdSchema.safeParse(pathId);
  if (!parsedId.success) {
    return { ok: false, reason: "not_found" };
  }

  await requireUser();

  if (!isAiConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const supabase = await createClient();

  const usedInLast24h = await countPersonalizationsInLast24h(supabase);
  if (usedInLast24h === null) {
    return { ok: false, reason: "failed" };
  }
  if (remainingPersonalizations(usedInLast24h) === 0) {
    return { ok: false, reason: "limit_reached" };
  }

  // RLS filtra al dueño: una ruta ajena o inexistente no vuelve.
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, budget_hours, assessments(answers)")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!path) {
    return { ok: false, reason: "not_found" };
  }

  // Solo pasos vigentes: la IA nunca ve ni reescribe un paso descartado.
  const { data: rawSteps, error: stepsError } = await supabase
    .from("path_steps")
    .select("origin, reason, courses(slug, title, hours, difficulty, outcome), programs(name)")
    .eq("path_id", path.id)
    .neq("status", "discarded")
    .order("stage", { ascending: true })
    .order("position", { ascending: true });

  if (stepsError || !rawSteps || rawSteps.length === 0) {
    return { ok: false, reason: "failed" };
  }

  const steps: PersonalizationStep[] = rawSteps.map((row) => ({
    courseSlug: row.courses.slug,
    courseTitle: row.courses.title,
    // numeric en Postgres: PostgREST puede devolverlo como string.
    hours: Number(row.courses.hours),
    difficulty: row.courses.difficulty,
    outcome: row.courses.outcome,
    origin: toStepOrigin(row.origin),
    programName: row.programs?.name ?? null,
    templateReason: row.reason,
  }));

  // assessment_id es `on delete set null`: una ruta puede quedarse sin respuestas y se
  // personaliza igual, solo con sus pasos.
  const answers = path.assessments?.answers ?? null;

  // El intento se registra ANTES de llamar al modelo y cuenta aunque falle: una llamada fallida
  // también gasta crédito (Decisiones del spec 11).
  const { error: logError } = await supabase
    .from("ai_personalizations")
    .insert({ path_id: path.id });

  if (logError) {
    return { ok: false, reason: "failed" };
  }

  const personalization = await requestPersonalization({
    profile: answers === null ? null : toLearnerContext(answers),
    freeText: answers === null ? "" : readFreeText(answers),
    budgetHours: path.budget_hours === null ? null : Number(path.budget_hours),
    steps,
  });

  if (!personalization) {
    return { ok: false, reason: "failed" };
  }

  const { error: applyError } = await supabase.rpc("apply_ai_personalization", {
    p_path_id: path.id,
    p_title: personalization.title,
    p_summary: personalization.summary,
    p_reasons: keepLastReasonPerCourse(personalization.reasons),
  });

  if (applyError) {
    return { ok: false, reason: "failed" };
  }

  revalidatePath(`/paths/${path.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
