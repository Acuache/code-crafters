import Link from "next/link";
import { PlusIcon } from "@phosphor-icons/react/ssr";

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

  return (
    <section className="flex flex-col gap-6" aria-labelledby="programs-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="programs-heading" className="font-heading text-2xl font-semibold">
            Programas
          </h2>
          <p className="text-sm text-muted-foreground">
            Las rutas oficiales de DevTalles. El motor arma cada ruta a partir de ellas.
          </p>
        </div>
        <Button variant="brand" render={<Link href="/admin/programs/new" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" />
          Nuevo programa
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Posición</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Cursos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(programs ?? []).map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="text-right tabular-nums">{program.position}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/programs/${encodeURIComponent(program.slug)}`}
                        className="font-medium text-primary-bright underline-offset-4 hover:underline"
                      >
                        {program.name}
                      </Link>
                      {isProgramReachable(program.slug) ? null : (
                        <Badge variant="secondary">No está en el cuestionario</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {program.slug}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {program.program_courses[0]?.count ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
