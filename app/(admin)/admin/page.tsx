import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BooksIcon,
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ExamIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import {
  CoursesTable,
  type AdminCourseRow,
  type CourseQuizStatus,
} from "@/components/admin/courses-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  quizzes: { is_active: boolean } | null;
};

function toQuizStatus(quiz: LoadedCourseRow["quizzes"]): CourseQuizStatus {
  if (!quiz) {
    return "none";
  }
  return quiz.is_active ? "active" : "inactive";
}

function toAdminCourseRow(row: LoadedCourseRow): AdminCourseRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    hours: Number(row.hours),
    difficulty: row.difficulty,
    isActive: row.is_active,
    programCount: row.program_courses[0]?.count ?? 0,
    quizStatus: toQuizStatus(row.quizzes),
  };
}

// Dentro de un filtro .or() de PostgREST el valor va entre comillas dobles para que una coma o un
// paréntesis del término no corten el filtro; adentro, las comillas y las barras se escapan.
function toQuotedIlikePattern(searchTerm: string): string {
  const escapedTerm = searchTerm.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"%${escapedTerm}%"`;
}

const COURSES_PER_PAGE = 10;

function toPageNumber(pageValue: string | string[] | undefined): number {
  const page = Number(Array.isArray(pageValue) ? pageValue[0] : pageValue);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function toCoursesPageHref(searchTerm: string, page: number): string {
  const params = new URLSearchParams();
  if (searchTerm) {
    params.set("q", searchTerm);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  await requireAdmin();

  const { q, page: pageValue } = await searchParams;
  const searchTerm = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const currentPage = toPageNumber(pageValue);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;

  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select(
      "id, slug, title, hours, difficulty, is_active, program_courses(count), quizzes(is_active)",
      { count: "exact" },
    )
    .order("title")
    .order("id");

  if (searchTerm) {
    const pattern = toQuotedIlikePattern(searchTerm);
    query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
  }

  const {
    data: rows,
    error,
    count,
  } = await query.range(startIndex, startIndex + COURSES_PER_PAGE - 1);
  if (error) {
    throw new Error(`No se pudieron cargar los cursos: ${error.message}`);
  }

  const totalCourses = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCourses / COURSES_PER_PAGE));
  if (currentPage > totalPages) {
    redirect(toCoursesPageHref(searchTerm, totalPages));
  }

  const courses = (rows ?? []).map(toAdminCourseRow);
  const activeCount = courses.filter((course) => course.isActive).length;
  const activeQuizCount = courses.filter((course) => course.quizStatus === "active").length;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="courses-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="courses-heading" className="font-heading text-2xl font-semibold">
            Cursos
          </h2>
          <p className="text-sm text-muted-foreground">
            Consulta su estado, edita sus datos y prepara los quizzes para las rutas.
          </p>
        </div>
        <Button variant="brand" render={<Link href="/admin/courses/new" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" />
          Nuevo curso
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card size="sm" className="brand-gradient-soft">
          <CardHeader>
            <CardTitle className="flex flex-col items-start gap-1 text-2xl font-semibold tabular-nums sm:flex-row sm:items-center sm:gap-2">
              <BooksIcon className="size-5 text-primary-bright" aria-hidden="true" />
              {courses.length}
            </CardTitle>
            <CardDescription className="text-xs">En esta página</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex flex-col items-start gap-1 text-2xl font-semibold tabular-nums sm:flex-row sm:items-center sm:gap-2">
              <CheckCircleIcon className="size-5 text-primary-bright" aria-hidden="true" />
              {activeCount}
            </CardTitle>
            <CardDescription className="text-xs">Activos en página</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex flex-col items-start gap-1 text-2xl font-semibold tabular-nums sm:flex-row sm:items-center sm:gap-2">
              <ExamIcon className="size-5 text-primary-bright" aria-hidden="true" />
              {activeQuizCount}
            </CardTitle>
            <CardDescription className="text-xs">Quiz activo en página</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row">
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
        {searchTerm ? (
          <Button variant="ghost" render={<Link href="/admin" />} nativeButton={false}>
            <XIcon data-icon="inline-start" aria-hidden="true" />
            Limpiar búsqueda
          </Button>
        ) : null}
      </form>

      {courses.length > 0 ? (
        <Card>
          <CardContent>
            <CoursesTable courses={courses} />
          </CardContent>
          <CardFooter className="flex-col gap-3 border-t sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Mostrando {startIndex + 1}–{startIndex + courses.length} de {totalCourses} cursos
            </p>
            {totalPages > 1 ? (
              <nav aria-label="Paginación de cursos" className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={toCoursesPageHref(searchTerm, currentPage - 1)} />}
                    nativeButton={false}
                  >
                    <CaretLeftIcon data-icon="inline-start" aria-hidden="true" />
                    Anterior
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <CaretLeftIcon data-icon="inline-start" aria-hidden="true" />
                    Anterior
                  </Button>
                )}
                <span className="px-1 text-sm text-muted-foreground" aria-current="page">
                  Página {currentPage} de {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={toCoursesPageHref(searchTerm, currentPage + 1)} />}
                    nativeButton={false}
                  >
                    Siguiente
                    <CaretRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Siguiente
                    <CaretRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                )}
              </nav>
            ) : null}
          </CardFooter>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {searchTerm ? `Ningún curso coincide con «${searchTerm}»` : "Aún no hay cursos"}
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={searchTerm ? "/admin" : "/admin/courses/new"} />}
              nativeButton={false}
            >
              {searchTerm ? (
                <ArrowCounterClockwiseIcon data-icon="inline-start" aria-hidden="true" />
              ) : (
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
              )}
              {searchTerm ? "Ver todos" : "Crear curso"}
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
