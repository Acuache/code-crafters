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

// gpt-6-luna: barato y con salida estructurada. gpt-4o-mini ignoraba el texto libre y escribía
// razones de relleno.
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

// Vive acá y no en daily-limit.ts para que ese archivo siga puro. RLS filtra al dueño, y
// `head: true` cuenta sin traer filas.
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

// La personalización automática de /paths/[id] solo corre si esto da 0.
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

// Nunca lanza: la IA es opcional (ADR 0001). Ante cualquier falla devuelve null y la ruta se queda
// con el texto de plantilla.
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

// Igual que requestPersonalization, pero con un timeout más corto: el usuario está esperando que
// se arme su ruta.
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

// Ante cualquier falla, o sin key, texto libre o usos del día, devuelve el perfil original: generar
// la ruta nunca se bloquea por la IA.
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

  // El uso se registra antes de llamar al modelo. path_id queda null: la ruta todavía no existe.
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

// Nunca el prompt (lleva el texto libre del usuario) ni la key: solo el tipo y el mensaje.
function logAiError(tag: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${tag}] ${errorName}: ${errorMessage}`);
}
