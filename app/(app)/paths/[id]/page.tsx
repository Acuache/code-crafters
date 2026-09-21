import { notFound } from "next/navigation";
import { ListChecksIcon } from "@phosphor-icons/react/ssr";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type PathPageProps = {
  params: Promise<{ id: string }>;
};

// Placeholder mínimo y de sólo lectura: el spec 08 lo reescribe entero con la vista real (chips de
// procedencia, acordeón de descartes, cambio de estado). Este spec sólo prueba que el redirect de
// generatePath() llega a datos reales.
export default async function PathPage({ params }: PathPageProps) {
  const { id } = await params;

  await requireUser();
  const supabase = await createClient();

  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, title, summary, budget_hours")
    .eq("id", id)
    .single();

  if (!path) {
    notFound();
  }

  // status <> 'discarded': sin este filtro, un curso que el motor sacó por "ya lo dominás" o por
  // recorte de presupuesto se muestra igual como si fuera parte de la ruta, y sus horas se suman
  // al total (perfil 4 de lib/paths/build-path.test.ts: react-de-cero queda discarded pese a ser
  // requerido).
  const { data: rawSteps } = await supabase
    .from("path_steps")
    .select("stage, position, courses(title, hours)")
    .eq("path_id", path.id)
    .neq("status", "discarded")
    .order("stage", { ascending: true })
    .order("position", { ascending: true });

  const activeSteps = rawSteps ?? [];
  // `courses.hours` es numeric(5,1) en Postgres y PostgREST puede devolverlo como string: sin
  // Number() la suma concatenaría en vez de sumar.
  const totalHours = activeSteps.reduce((sum, step) => sum + Number(step.courses.hours), 0);
  const budgetHours = path.budget_hours ?? 0;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{path.title}</CardTitle>
          {path.summary ? <CardDescription>{path.summary}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecksIcon />
            {activeSteps.length} pasos · {totalHours} h de {budgetHours} h
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            {activeSteps.map((step) => (
              <li key={`${step.stage}-${step.position}-${step.courses.title}`}>
                {step.courses.title}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
