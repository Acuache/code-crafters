import Link from "next/link";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { CoursesTable, type AdminCourseRow } from "@/components/admin/courses-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type LoadedCourseRow = {
  id: number;
  slug: string;
  title: string;
  hours: number | string;
  difficulty: AdminCourseRow["difficulty"];
  is_active: boolean;
  program_courses: { count: number }[];
};

function toAdminCourseRow(row: LoadedCourseRow): AdminCourseRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    hours: Number(row.hours),
    difficulty: row.difficulty,
    isActive: row.is_active,
    programCount: row.program_courses[0]?.count ?? 0,
  };
}

// Dentro de un filtro .or() de PostgREST el valor va entre comillas dobles para que una coma o un
// paréntesis del término no corten el filtro; adentro, las comillas y las barras se escapan.
function toQuotedIlikePattern(searchTerm: string): string {
  const escapedTerm = searchTerm.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"%${escapedTerm}%"`;
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireAdmin();

  const { q } = await searchParams;
  const searchTerm = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("id, slug, title, hours, difficulty, is_active, program_courses(count)")
    .order("title");

  if (searchTerm) {
    const pattern = toQuotedIlikePattern(searchTerm);
    query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(`No se pudieron cargar los cursos: ${error.message}`);
  }

  const courses = (rows ?? []).map(toAdminCourseRow);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="courses-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="courses-heading" className="font-heading text-2xl font-semibold">
            Cursos
          </h2>
          <p className="text-sm text-muted-foreground">
            {courses.length === 1 ? "1 curso" : `${courses.length} cursos`}
            {searchTerm ? ` para «${searchTerm}»` : ""}
          </p>
        </div>
        <Button variant="brand" render={<Link href="/admin/courses/new" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" />
          Nuevo curso
        </Button>
      </div>

      <form method="get" role="search" className="flex gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={searchTerm}
          placeholder="Buscar por título o slug"
          aria-label="Buscar por título o slug"
        />
        <Button type="submit" variant="outline">
          <MagnifyingGlassIcon data-icon="inline-start" />
          Buscar
        </Button>
      </form>

      {courses.length > 0 ? (
        <Card>
          <CardContent>
            <CoursesTable courses={courses} />
          </CardContent>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Ningún curso coincide con «{searchTerm}»</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" render={<Link href="/admin" />} nativeButton={false}>
              Ver todos
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
