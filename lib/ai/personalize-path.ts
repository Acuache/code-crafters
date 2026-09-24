import "server-only";

import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";

import type { LearnerProfile } from "@/lib/paths/types";
import type { Database } from "@/lib/supabase/database.types";

import { buildPersonalizationPrompt, type PersonalizationInput } from "./build-prompt";
import { remainingPersonalizations } from "./daily-limit";
import { buildPersonalizationSchema, type Personalization } from "./personalization-schema";
import {
  applyProfileAdjustment,
  buildProfileAdjustmentPrompt,
  profileAdjustmentSchema,
  type AppliedAdjustment,
  type ProfileAdjustment,
} from "./profile-adjustment";

// Modelo elegido por el usuario: gpt-6-luna ($0.10/$0.50 por 1M tokens, salida estructurada).
// Antes se probaron gpt-4o-mini (ignoraba el texto libre y escribía razones de relleno) y
// gpt-4.1-mini: la IA solo suma si la ruta se nota hecha para esa persona.
export const PERSONALIZATION_MODEL = "gpt-6-luna";
// gpt-6-luna razona, y su esfuerzo por defecto (medium) arriesga el timeout de 15 s. "low" alcanza
// para redactar siguiendo las reglas del prompt.
const REASONING_EFFORT = "low";
export const PERSONALIZATION_TIMEOUT_MS = 15_000;
// El ajuste corre mientras el usuario espera su ruta nueva: si tarda más, se genera sin ajuste.
export const PROFILE_ADJUSTMENT_TIMEOUT_MS = 8_000;

// Un solo reintento: con el default (2) los reintentos se comerían el presupuesto de 15 s, y el
// abortSignal cortaría igual a mitad de uno.
const MAX_RETRIES = 1;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Usos del usuario en la ventana móvil de 24 h. Vive acá y no en daily-limit.ts para que ese
// archivo siga siendo puro y testeable sin Supabase. La RLS de ai_personalizations ya filtra al
// dueño; `count: "exact", head: true` cuenta sin traer filas.
export async function countPersonalizationsInLast24h(
  supabase: SupabaseClient<Database>,
): Promise<number | null> {
  const since = new Date(Date.now() - DAY_IN_MS).toISOString();

  const { count, error } = await supabase
    .from("ai_personalizations")
    .select("id", { count: "exact", head: true })
    .gt("created_at", since);

  if (error) {
    return null;
  }

  return count ?? 0;
}

// Intentos ya hechos sobre una ruta, en cualquier fecha. El arranque automático de /paths/[id]
// solo corre cuando es 0: así un intento fallido no se reintenta solo en cada visita.
export async function countPersonalizationAttemptsForPath(
  supabase: SupabaseClient<Database>,
  pathId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("ai_personalizations")
    .select("id", { count: "exact", head: true })
    .eq("path_id", pathId);

  if (error) {
    return null;
  }

  return count ?? 0;
}

// Nunca lanza: la Capa 2 es opcional por diseño (ADR 0001). Sin key, timeout, error de la API o
// respuesta que no valida contra el schema → null, y la ruta se queda con su texto por plantilla.
export async function requestPersonalization(
  input: PersonalizationInput,
): Promise<Personalization | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const [firstSlug, ...otherSlugs] = input.steps.map((step) => step.courseSlug);
  if (!firstSlug) {
    return null;
  }

  const schema = buildPersonalizationSchema([firstSlug, ...otherSlugs]);
  const { system, prompt } = buildPersonalizationPrompt(input);

  try {
    const { output } = await generateText({
      ...modelSettings(PERSONALIZATION_TIMEOUT_MS),
      instructions: system,
      prompt,
      output: Output.object({ schema }),
    });

    return output;
  } catch (error) {
    logAiError("ai-personalization", error);
    return null;
  }
}

// Misma política que requestPersonalization, pero corre en el camino crítico de generatePath
// (pantalla "Armando tu ruta…"): por eso su timeout es más corto. Sin texto libre no llama.
export async function requestProfileAdjustment(
  profile: LearnerProfile,
  freeText: string,
): Promise<ProfileAdjustment | null> {
  if (!isAiConfigured() || freeText.trim() === "") {
    return null;
  }

  const { system, prompt } = buildProfileAdjustmentPrompt(profile, freeText);

  try {
    const { output } = await generateText({
      ...modelSettings(PROFILE_ADJUSTMENT_TIMEOUT_MS),
      instructions: system,
      prompt,
      output: Output.object({ schema: profileAdjustmentSchema }),
    });

    return output;
  } catch (error) {
    logAiError("ai-profile-adjustment", error);
    return null;
  }
}

// Todo el ajuste de respuestas que generatePath (spec 07) necesita, en una sola llamada, para que
// la excepción a la regla 5 en ese archivo sea una línea. Sin key, sin texto libre, sin usos del
// día o ante cualquier falla devuelve el perfil original y applied null: generar nunca se bloquea.
export async function adjustProfileFromFreeText(
  supabase: SupabaseClient<Database>,
  profile: LearnerProfile,
  freeText: string,
): Promise<{ profile: LearnerProfile; applied: AppliedAdjustment | null }> {
  const unchanged = { profile, applied: null };

  if (!isAiConfigured() || freeText.trim() === "") {
    return unchanged;
  }

  const usedInLast24h = await countPersonalizationsInLast24h(supabase);
  if (usedInLast24h === null || remainingPersonalizations(usedInLast24h) === 0) {
    return unchanged;
  }

  // El uso se registra antes de llamar al modelo, como en personalizePath. path_id queda null: la
  // ruta todavía no existe.
  const { error: logError } = await supabase.from("ai_personalizations").insert({ path_id: null });
  if (logError) {
    return unchanged;
  }

  const adjustment = await requestProfileAdjustment(profile, freeText);
  if (!adjustment) {
    return unchanged;
  }

  return applyProfileAdjustment(profile, adjustment);
}

function modelSettings(timeoutMs: number) {
  return {
    model: openai(PERSONALIZATION_MODEL),
    providerOptions: {
      openai: { reasoningEffort: REASONING_EFFORT } satisfies OpenAILanguageModelResponsesOptions,
    },
    maxRetries: MAX_RETRIES,
    abortSignal: AbortSignal.timeout(timeoutMs),
  };
}

// Solo el tipo y el mensaje del error: nunca el prompt (lleva el texto libre del usuario) ni la
// key. Queda en los logs de Vercel para depurar.
function logAiError(tag: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${tag}] ${errorName}: ${errorMessage}`);
}
