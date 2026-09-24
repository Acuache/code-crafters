import Link from "next/link";
import { notFound } from "next/navigation";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ProgramForm } from "@/components/admin/program-form";
import { LevelBadge } from "@/components/brand/level-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type ProgramCourseLevel = "requerido" | "recomendado" | "opcional";

const LEVEL_RANK: Record<ProgramCourseLevel, number> = {
  requerido: 0,
  recomendado: 1,
  opcional: 2,
};

function decodeSlugParam(slugParam: string): string {
  try {
    return decodeURIComponent(slugParam);
  } catch {
    return slugParam;
  }
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("es-ES")} h`;
}

export default async function EditProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();

  const { slug: slugParam } = await params;
  const slug = decodeSlugParam(slugParam);
  const supabase = await createClient();

  const { data: program, error } = await supabase
    .from("programs")
    .select(
      "id, slug, name, position, program_courses(id, stage, level, position, note, courses(slug, title, hours, is_active))",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cargar el programa: ${error.message}`);
  }
  if (!program) {
    notFound();
  }

  // El orden en que el motor recorre el programa: etapa, nivel y alternativa (spec 07).
  const placements = [...program.program_courses].sort((a, b) => {
    if (a.stage !== b.stage) {
      return a.stage - b.stage;
    }
    if (a.level !== b.level) {
      return LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
    }
    return a.position - b.position;
  });

  const isReachable = isProgramReachable(program.slug);

  return (
    <div className="flex flex-col gap-6">
      {isReachable ? null : (
        <Alert>
          <WarningIcon />
          <AlertTitle>Este programa no aparece en ninguna meta del cuestionario</AlertTitle>
          <AlertDescription>
            Sus cursos no entran en ninguna ruta generada hasta que alguna meta de
            lib/paths/goals.ts incluya «{program.slug}». Ese cambio se hace por código.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <CardDescription>El nombre y la posición se pueden editar; el slug no.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm
            mode="edit"
            programId={program.id}
            initialValues={{ slug: program.slug, name: program.name, position: program.position }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cursos del programa</CardTitle>
          <CardDescription>
            En el orden en que el motor los recorre. Para agregar, mover o quitar uno, ve a la
            página del curso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no tiene cursos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Etapa</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placements.map((placement) => (
                  <TableRow key={placement.id}>
                    <TableCell className="text-right tabular-nums">{placement.stage}</TableCell>
                    <TableCell>
                      <LevelBadge nivel={placement.level} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/courses/${encodeURIComponent(placement.courses.slug)}`}
                        className="font-medium text-primary-bright underline-offset-4 hover:underline"
                      >
                        {placement.courses.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                      {placement.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatHours(Number(placement.courses.hours))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
