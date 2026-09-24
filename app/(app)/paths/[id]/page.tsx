import { notFound } from "next/navigation";

import { PathExperience } from "@/components/paths/path-experience";
import { buildPathView, type PathStepInput } from "@/lib/paths/path-view";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type PathPageProps = { params: Promise<{ id: string }> };

async function loadPathView(pathId: string, userId: string) {
  const supabase = await createClient();
  const { data: path } = await supabase.from("learning_paths")
    .select("id, title, summary, budget_hours").eq("id", pathId).eq("user_id", userId).maybeSingle();
  if (!path) return null;

  const [{ data: steps }, { data: profile }, { data: activities }] = await Promise.all([
    supabase.from("path_steps")
      .select("id, stage, position, origin, reason, status, discard_reason, courses(id, slug, title, summary, hours, chapters, url)")
      .eq("path_id", path.id).order("stage").order("position"),
    supabase.from("profiles").select("timezone, current_streak, best_streak, last_activity_date")
      .eq("id", userId).single(),
    supabase.from("streak_activities").select("activity_date").eq("user_id", userId)
      .order("activity_date", { ascending: false }).limit(35),
  ]);

  return {
    path: buildPathView({ path, steps: (steps ?? []) as PathStepInput[] }),
    streak: {
      current: profile?.current_streak ?? 0,
      best: profile?.best_streak ?? 0,
      activityDates: (activities ?? []).map((activity) => activity.activity_date),
    },
  };
}

export default async function PathPage({ params }: PathPageProps) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const result = await loadPathView(id, user.userId);
  if (!result) notFound();
  return <PathExperience path={result.path} streak={result.streak} />;
}
