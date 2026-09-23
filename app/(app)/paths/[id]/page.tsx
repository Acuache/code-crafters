import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PathIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { PathStepsView, type PathStepView } from "@/components/paths/path-steps-view";
import { Button } from "@/components/ui/button";
import type { StepOrigin } from "@/lib/paths/types";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type PathPageProps = {
  params: Promise<{ id: string }>;
};

const STEP_ORIGINS: readonly StepOrigin[] = ["requerido", "recomendado", "opcional", "interes"];

// `path_steps.origin` es `text` en Postgres (spec 02), no un enum: el tipo generado es `string`.
// Sólo lo escribe el motor del spec 04 con estos cuatro valores; si aparece otro es un dato roto,
// y es mejor que falle ruidosamente que mostrar un badge inventado.
function toStepOrigin(value: string): StepOrigin {
  const origin = STEP_ORIGINS.find((knownOrigin) => knownOrigin === value);
  if (!origin) {
    throw new Error(`path_steps.origin desconocido: ${value}`);
  }

  return origin;
}

export default async function PathPage({ params }: PathPageProps) {
  const { id } = await params;

  await requireUser();
  const supabase = await createClient();

  // RLS filtra al dueño: una ruta ajena o inexistente no vuelve y da 404.
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, title, summary, budget_hours")
    .eq("id", id)
    .single();

  if (!path) {
    notFound();
  }

  // Vigentes y descartados juntos: la vista los separa, para que el estado optimista pueda mover
  // un paso de la lista al acordeón (y de vuelta) sin recargar.
  const { data: rawSteps } = await supabase
    .from("path_steps")
    .select(
      "id, stage, position, origin, reason, status, discard_reason, courses(title, hours, url, image_url), programs(slug, name)",
    )
    .eq("path_id", path.id)
    .order("stage", { ascending: true })
    .order("position", { ascending: true });

  const steps: PathStepView[] = (rawSteps ?? []).map((row) => ({
    id: row.id,
    stage: row.stage,
    position: row.position,
    origin: toStepOrigin(row.origin),
    reason: row.reason,
    status: row.status,
    discardReason: row.discard_reason,
    courseTitle: row.courses.title,
    // numeric(5,1) en Postgres: PostgREST puede devolverlo como string, y sin Number() la suma
    // de horas concatenaría en vez de sumar.
    courseHours: Number(row.courses.hours),
    courseUrl: row.courses.url,
    courseImageUrl: row.courses.image_url,
    // null para un curso que entró por interés sin pertenecer a un programa fusionado (ADR 0003).
    programSlug: row.programs?.slug ?? null,
    programName: row.programs?.name ?? null,
  }));

  const budgetHours = path.budget_hours === null ? null : Number(path.budget_hours);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al dashboard
        </Button>
      </div>

      <header className="brand-gradient-soft relative flex items-center gap-6 overflow-hidden rounded-3xl border p-6 shadow-brand sm:p-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Eyebrow className="flex items-center gap-2">
            <PathIcon />
            Tu ruta de aprendizaje
          </Eyebrow>
          <h1 className="text-title text-balance">{path.title}</h1>
          {path.summary ? (
            <p className="max-w-prose text-pretty text-muted-foreground">{path.summary}</p>
          ) : null}
        </div>
        {/* Decorativa: el título de la ruta ya está al lado, así que alt="" (CLAUDE.md §Marca). */}
        <Image
          src="/astronauta.webp"
          alt=""
          width={144}
          height={144}
          className="hidden shrink-0 drop-shadow-xl sm:block"
        />
      </header>

      <PathStepsView steps={steps} budgetHours={budgetHours} />
    </div>
  );
}
