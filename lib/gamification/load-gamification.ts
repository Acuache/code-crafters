import "server-only";

import type { createClient } from "@/lib/supabase/server";

import { todayInTimeZone } from "./streak";
import {
  summarizeGamification,
  type GamificationInput,
  type GamificationPath,
  type GamificationSummary,
} from "./summary";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type PathsAndActivity = Omit<GamificationInput, "today">;

// Un error se lanza: cada llamador decide si la gamificación es accesoria.
async function fetchPathsAndActivity(supabase: ServerSupabase): Promise<PathsAndActivity> {
  const [pathsResult, activityResult] = await Promise.all([
    supabase.from("learning_paths").select("id, path_steps(id, course_id, status, courses(hours))"),
    supabase.from("streak_activities").select("activity_date"),
  ]);

  if (pathsResult.error) {
    throw new Error(`[gamification] learning_paths: ${pathsResult.error.message}`);
  }

  if (activityResult.error) {
    throw new Error(`[gamification] streak_activities: ${activityResult.error.message}`);
  }

  const paths: GamificationPath[] = pathsResult.data.map((path) => ({
    id: path.id,
    steps: path.path_steps.map((step) => ({
      id: step.id,
      courseId: step.course_id,
      status: step.status,
      // `numeric` llega como string desde PostgREST.
      hours: Number(step.courses.hours),
    })),
  }));

  const activityDays = activityResult.data.map((activity) => activity.activity_date);

  return { paths, activityDays };
}

// Para las actions: "hoy" sale de la zona que mandó el navegador.
export async function loadGamificationInput(
  supabase: ServerSupabase,
  today: string,
): Promise<GamificationInput> {
  const pathsAndActivity = await fetchPathsAndActivity(supabase);
  return { ...pathsAndActivity, today };
}

// Para el dashboard y el perfil: "hoy" sale de profiles.timezone.
export async function loadGamification(
  supabase: ServerSupabase,
  userId: string,
): Promise<{ input: GamificationInput; summary: GamificationSummary }> {
  const [pathsAndActivity, profileResult] = await Promise.all([
    fetchPathsAndActivity(supabase),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(`[gamification] profiles: ${profileResult.error.message}`);
  }

  const today = todayInTimeZone(profileResult.data?.timezone ?? "UTC");
  const input: GamificationInput = { ...pathsAndActivity, today };

  return { input, summary: summarizeGamification(input) };
}
