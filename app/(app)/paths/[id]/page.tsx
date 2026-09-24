import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PathIcon } from "@phosphor-icons/react/ssr";

import { AutoPersonalizer } from "@/components/ai/auto-personalizer";
import { ProfileAdjustmentsNote } from "@/components/ai/profile-adjustments-note";
import { AiBadge } from "@/components/brand/ai-badge";
import { Eyebrow } from "@/components/brand/eyebrow";
import { StreakCard } from "@/components/gamification/streak-card";
import type { PathStepView, PathView } from "@/components/paths/path-step";
import { PathStepsView } from "@/components/paths/path-steps-view";
import { Button } from "@/components/ui/button";
import { assessmentAnswersSchema } from "@/components/quiz/quiz-schema";
import { remainingPersonalizations } from "@/lib/ai/daily-limit";
import {
  countPersonalizationAttemptsForPath,
  countPersonalizationsInLast24h,
  isAiConfigured,
} from "@/lib/ai/personalize-path";
import { computeStreak, todayInTimeZone } from "@/lib/gamification/streak";
import { isStepOrigin } from "@/lib/paths/levels";
import type { StepOrigin } from "@/lib/paths/types";
import { isQuizConfigured } from "@/lib/quizzes/generate";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type PathPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string | string[] }>;
};

// Solo el motor escribe `origin`: otro valor es un dato roto, y es mejor fallar que mostrar un
// badge inventado.
function toStepOrigin(value: string): StepOrigin {
  if (!isStepOrigin(value)) {
    throw new Error(`path_steps.origin desconocido: ${value}`);
  }

  return value;
}

type AutoPersonalizeContext = {
  pathId: string;
  isPersonalized: boolean;
  answers: unknown;
};

// La IA redacta el texto de la ruta una sola vez, y solo si el usuario escribió texto libre: sin
// él no tiene nada propio que contar. Las consultas van de la más barata a la más cara.
async function shouldAutoPersonalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  { pathId, isPersonalized, answers }: AutoPersonalizeContext,
): Promise<boolean> {
  if (!isAiConfigured() || isPersonalized) {
    return false;
  }

  const parsedAnswers = assessmentAnswersSchema.safeParse(answers);
  const wroteFreeText = parsedAnswers.success && parsedAnswers.data.freeText.trim() !== "";
  if (!wroteFreeText) {
    return false;
  }

  const usedInLast24h = await countPersonalizationsInLast24h(supabase);
  if (usedInLast24h === null || remainingPersonalizations(usedInLast24h) === 0) {
    return false;
  }

  // Un intento previo, aunque haya fallado, evita reintentar solo en cada visita.
  const attemptsForPath = await countPersonalizationAttemptsForPath(supabase, pathId);
  return attemptsForPath === 0;
}

// "Hoy" sale de la última zona guardada: el servidor no conoce la del navegador.
async function loadStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: activities }, { data: profile }] = await Promise.all([
    supabase.from("streak_activities").select("activity_date"),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);

  const activityDates = (activities ?? []).map((activity) => activity.activity_date);
  const today = todayInTimeZone(profile?.timezone ?? "UTC");

  return { streak: computeStreak(activityDates, today), activityDates, today };
}

export default async function PathPage({ params, searchParams }: PathPageProps) {
  const { id } = await params;
  // El mapa es la vista por defecto.
  const { vista } = await searchParams;
  const initialView: PathView = vista === "lista" ? "lista" : "mapa";

  const user = await requireUser();
  const supabase = await createClient();

  // RLS filtra al dueño: una ruta ajena o inexistente no vuelve y da 404.
  const { data: path } = await supabase
    .from("learning_paths")
    .select(
      "id, title, summary, budget_hours, ai_title, ai_summary, personalized_at, ai_adjustments, assessments(answers)",
    )
    .eq("id", id)
    .single();

  if (!path) {
    notFound();
  }

  // Vigentes y descartados juntos: así el estado optimista mueve un paso entre la lista y el
  // acordeón sin recargar.
  const { data: rawSteps } = await supabase
    .from("path_steps")
    .select(
      "id, stage, position, origin, reason, ai_reason, status, discard_reason, courses(title, hours, url, image_url, chapters), programs(slug, name)",
    )
    .eq("path_id", path.id)
    .order("stage", { ascending: true })
    .order("position", { ascending: true });

  const steps: PathStepView[] = (rawSteps ?? []).map((row) => ({
    id: row.id,
    stage: row.stage,
    position: row.position,
    origin: toStepOrigin(row.origin),
    // La razón de la IA si existe; si no, la del motor.
    reason: row.ai_reason ?? row.reason,
    status: row.status,
    discardReason: row.discard_reason,
    courseTitle: row.courses.title,
    courseHours: Number(row.courses.hours),
    courseUrl: row.courses.url,
    courseImageUrl: row.courses.image_url,
    courseChapters: row.courses.chapters,
    // null para un curso que entró por interés sin pertenecer a un programa de la ruta.
    programSlug: row.programs?.slug ?? null,
    programName: row.programs?.name ?? null,
  }));

  const budgetHours = path.budget_hours === null ? null : Number(path.budget_hours);

  // El texto de la IA reemplaza al de plantilla solo en pantalla; el original sigue en la base.
  const title = path.ai_title ?? path.title;
  const summary = path.ai_summary ?? path.summary;
  const isPersonalized = path.personalized_at !== null;
  const [autoPersonalize, streakView] = await Promise.all([
    shouldAutoPersonalize(supabase, {
      pathId: path.id,
      isPersonalized,
      answers: path.assessments?.answers,
    }),
    loadStreak(supabase, user.userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al dashboard
        </Button>
      </div>

      <header className="relative flex items-center gap-6 overflow-hidden rounded-3xl border brand-gradient-soft p-6 shadow-brand sm:p-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow className="flex items-center gap-2">
              <PathIcon />
              Tu ruta de aprendizaje
            </Eyebrow>
            {isPersonalized ? <AiBadge /> : null}
          </div>
          <h1 className="text-title text-balance">{title}</h1>
          {summary ? (
            <p className="max-w-prose text-pretty text-muted-foreground">{summary}</p>
          ) : null}
          {autoPersonalize ? <AutoPersonalizer pathId={path.id} /> : null}
        </div>
        {/* Decorativa: el título de la ruta ya está al lado. */}
        <Image
          src="/astronauta.webp"
          alt=""
          width={144}
          height={144}
          className="hidden shrink-0 drop-shadow-xl sm:block"
        />
      </header>

      {path.ai_adjustments ? <ProfileAdjustmentsNote adjustments={path.ai_adjustments} /> : null}

      <StreakCard
        streak={streakView.streak}
        activityDates={streakView.activityDates}
        today={streakView.today}
      />

      <PathStepsView
        pathId={path.id}
        steps={steps}
        budgetHours={budgetHours}
        initialView={initialView}
        quizzesEnabled={isQuizConfigured()}
      />
    </div>
  );
}
