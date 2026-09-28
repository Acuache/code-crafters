import Link from "next/link";
import { PlusIcon, TreeStructureIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isProgramReachable } from "@/lib/admin/engine-references";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProgramsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: programs, error } = await supabase
    .from("programs")
    .select("id, slug, name, position, program_courses(count)")
    .order("position");

  if (error) {
    throw new Error(`No se pudieron cargar los programas: ${error.message}`);
  }

  const programCount = programs?.length ?? 0;
  const reachableCount = (programs ?? []).filter((program) =>
    isProgramReachable(program.slug),
  ).length;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="programs-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="programs-heading" className="font-heading text-2xl font-semibold">
            Programas
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Las rutas oficiales de DevTalles. El motor arma cada ruta a partir de ellas.
          </p>
        </div>
        <Button variant="brand" render={<Link href="/admin/programs/new" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" />
          Nuevo programa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <TreeStructureIcon className="size-4 text-primary-bright" aria-hidden="true" />
        <span>{programCount === 1 ? "1 programa" : `${programCount} programas`}</span>
        <span aria-hidden="true">·</span>
        <span>{reachableCount} en el cuestionario</span>
      </div>

      <Card>
        <CardContent>
          {programCount === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay programas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden text-right sm:table-cell">Posición</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead className="text-right">Cursos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(programs ?? []).map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {program.position}
                    </TableCell>
                    <TableCell className="min-w-0 whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        <Link
                          href={`/admin/programs/${encodeURIComponent(program.slug)}`}
                          className="inline-flex min-h-6 items-center font-medium text-primary-bright underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {program.name}
                        </Link>
                        <span className="font-mono text-xs break-all text-muted-foreground">
                          {program.slug}
                        </span>
                        {isProgramReachable(program.slug) ? null : (
                          <Badge variant="secondary">No está en el cuestionario</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {program.program_courses[0]?.count ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
