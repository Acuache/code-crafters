import { notFound } from "next/navigation";
import { FireIcon, ListChecksIcon } from "@phosphor-icons/react/ssr";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
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
  const { path, streak } = result;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{path.title}</CardTitle>
          {path.summary ? <CardDescription>{path.summary}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <Progress value={path.progressPercentage}>
            <ProgressLabel>Progreso: {path.progressPercentage}%</ProgressLabel>
          </Progress>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecksIcon /> {path.mainSteps.length} pasos · {path.totalHours} h de {path.budget_hours ?? 0} h
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FireIcon /> {streak.current} días · mejor racha: {streak.best}
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            {path.mainSteps.map((step) => <li key={step.id}>{step.course.title} · {step.uiStatus}</li>)}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
