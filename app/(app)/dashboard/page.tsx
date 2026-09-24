import Image from "next/image";
import Link from "next/link";
import { PlusIcon, ShieldCheckIcon, SignOutIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { PathCard, type DashboardPath } from "@/components/dashboard/path-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { findNextStep } from "@/lib/progress/next-step";
import { summarizePathProgress, type PathStepStatus } from "@/lib/progress/path-progress";
import { signOut } from "@/lib/supabase/actions";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type LoadedPathRow = {
  id: string;
  title: string;
  ai_title: string | null;
  created_at: string;
  budget_hours: number | string | null;
  path_steps: {
    status: PathStepStatus;
    stage: number;
    position: number;
    courses: { title: string; hours: number | string };
  }[];
};

function toDashboardPath(row: LoadedPathRow): DashboardPath {
  // numeric en Postgres: PostgREST puede devolverlo como string, y sin Number() la suma de horas
  // concatenaría en vez de sumar (mismo riesgo que en los specs 07 y 08).
  const budgetHours = row.budget_hours === null ? null : Number(row.budget_hours);

  const steps = row.path_steps.map((step) => ({
    status: step.status,
    stage: step.stage,
    position: step.position,
    courseTitle: step.courses.title,
    hours: Number(step.courses.hours),
  }));

  return {
    id: row.id,
    // Spec 11: el título de la IA si la ruta se personalizó, igual que en /paths/[id], para que la
    // misma ruta no tenga dos nombres según la pantalla.
    title: row.ai_title ?? row.title,
    createdAt: row.created_at,
    progress: summarizePathProgress(steps, budgetHours),
    nextStep: findNextStep(steps),
  };
}

function formatPathCount(count: number): string {
  return count === 1 ? "1 ruta" : `${count} rutas`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const displayName = user.username ?? user.email ?? "Sin nombre";
  const initials = displayName.slice(0, 2).toUpperCase();

  const supabase = await createClient();

  // Una sola query para todas las rutas, con sus pasos embebidos: una por tarjeta serían N+1 viajes.
  // RLS filtra al dueño. Los pasos no se ordenan acá: findNextStep los ordena por (stage, position).
  const { data: rows } = await supabase
    .from("learning_paths")
    .select(
      "id, title, ai_title, created_at, budget_hours, path_steps(status, stage, position, courses(title, hours))",
    )
    .order("created_at", { ascending: false });

  const paths = (rows ?? []).map(toDashboardPath);
  const hasPaths = paths.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="brand-gradient-soft flex flex-wrap items-center gap-4 rounded-3xl border p-6 shadow-brand sm:p-8">
        <Avatar size="lg">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Eyebrow>Tu panel</Eyebrow>
          <h1 className="text-title truncate">Hola, {displayName}</h1>
        </div>
        {/* Excepción a la regla 5 del mapa: el spec 10 agrega solo este link para el admin. */}
        {user.role === "admin" ? (
          <Button variant="outline" render={<Link href="/admin" />} nativeButton={false}>
            <ShieldCheckIcon data-icon="inline-start" />
            Panel de administración
          </Button>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <SignOutIcon data-icon="inline-start" />
            Cerrar sesión
          </Button>
        </form>
      </header>

      {hasPaths ? (
        <section className="flex flex-col gap-6" aria-labelledby="paths-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="paths-heading" className="font-heading text-2xl font-semibold">
                Tus rutas
              </h2>
              <p className="text-sm text-muted-foreground">{formatPathCount(paths.length)}</p>
            </div>
            <Button variant="brand" render={<Link href="/quiz" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Crear nueva ruta
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paths.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        </section>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              {/* Decorativa: el título del estado vacío ya está al lado (CLAUDE.md §Marca). */}
              <Image src="/astronauta.webp" alt="" width={128} height={128} />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes rutas</EmptyTitle>
            <EmptyDescription>
              Responde el cuestionario y armamos tu primera ruta con los cursos de DevTalles.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="brand" render={<Link href="/quiz" />} nativeButton={false}>
              Crear mi primera ruta
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
