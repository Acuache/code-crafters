import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { AchievementGrid } from "@/components/gamification/achievement-grid";
import { StreakCard } from "@/components/gamification/streak-card";
import { XpBar } from "@/components/gamification/xp-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { loadGamification } from "@/lib/gamification/load-gamification";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type Stat = {
  label: string;
  value: string;
};

const HOURS_FORMAT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

// Acá la gamificación es todo el contenido: si falla, responde app/error.tsx.
export default async function ProfilePage() {
  const user = await requireUser();
  const displayName = user.username ?? user.email ?? "Sin nombre";
  const initials = displayName.slice(0, 2).toUpperCase();

  const supabase = await createClient();
  const { input, summary } = await loadGamification(supabase, user.userId);

  // La mejor racha ya está en la StreakCard.
  const stats: Stat[] = [
    { label: "Cursos hechos", value: String(summary.stats.completedCourses) },
    { label: "Horas completadas", value: HOURS_FORMAT.format(summary.stats.completedHours) },
    { label: "Rutas creadas", value: String(summary.stats.createdPaths) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 rounded-3xl border brand-gradient-soft p-6 shadow-brand sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-4 sm:basis-0">
            <Avatar size="lg">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <Eyebrow>Tu perfil</Eyebrow>
              <h1 className="truncate text-title">{displayName}</h1>
            </div>
          </div>
          <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver al panel
          </Button>
        </div>
        <XpBar
          level={summary.level.level}
          currentXp={summary.level.xpIntoLevel}
          nextLevelXp={summary.level.xpForNextLevel}
        />
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="streak-heading">
        <h2 id="streak-heading" className="font-heading text-2xl font-semibold">
          Tu racha
        </h2>
        <StreakCard
          streak={summary.streak}
          activityDates={input.activityDays}
          today={input.today}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="font-heading text-2xl font-semibold">
          Tu avance
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <li key={stat.label}>
              <Card size="sm" className="h-full">
                <CardContent className="flex flex-col gap-1">
                  <span className="text-title tabular-nums">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="achievements-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="achievements-heading" className="font-heading text-2xl font-semibold">
            Tus insignias
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {summary.earned.length} de {ACHIEVEMENTS.length} ganadas
          </p>
        </div>
        <AchievementGrid earned={summary.earned} />
      </section>
    </div>
  );
}
