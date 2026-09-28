import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamIcon } from "@phosphor-icons/react/ssr";

import { CourseForm, type CourseFormFields } from "@/components/admin/course-form";
import {
  CoursePlacements,
  type PlacementRow,
  type ProgramOption,
} from "@/components/admin/course-placements";
import {
  CoursePrerequisites,
  type CourseOption,
  type PrerequisiteRow,
} from "@/components/admin/course-prerequisites";
import { CourseStatusCard } from "@/components/admin/course-status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decodeSlugParam } from "@/lib/admin/route-params";
import { isAiConfigured } from "@/lib/ai/personalize-path";
import { PROGRAM_LEVEL_ORDER } from "@/lib/paths/levels";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

function joinLines(values: string[]): string {
  return values.join("\n");
}

export default async function EditCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();

  const { slug: slugParam } = await params;
  const slug = decodeSlugParam(slugParam);
  const supabase = await createClient();

  const [courseResult, programsResult] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "*, program_courses(id, stage, level, position, note, programs(id, slug, name, position)), quizzes(is_active)",
      )
      .eq("slug", slug)
      .maybeSingle(),
    supabase.from("programs").select("id, name").order("position"),
  ]);

  if (courseResult.error || programsResult.error) {
    throw new Error("No se pudo cargar el curso.");
  }

  const course = courseResult.data;
  if (!course) {
    notFound();
  }

  const initialValues: CourseFormFields = {
    slug: course.slug,
    title: course.title,
    summary: course.summary ?? "",
    url: course.url,
    imageUrl: course.image_url ?? "",
    instructor: course.instructor ?? "",
    hours: Number(course.hours),
    lessons: course.lessons,
    price: course.price === null ? Number.NaN : Number(course.price),
    isFree: course.is_free,
    isPro: course.is_pro,
    isNew: course.is_new,
    inConstruction: course.in_construction,
    difficulty: course.difficulty,
    outcome: course.outcome,
    areas: joinLines(course.areas),
    prerequisites: joinLines(course.prerequisites),
    topics: joinLines(course.topics),
    outcomes: joinLines(course.outcomes),
    chapters: joinLines(course.chapters),
    related: joinLines(course.related),
  };

  // Mismo orden que ve el alumno: por programa, y dentro de él por etapa y nivel.
  const sortedPlacements = [...course.program_courses].sort((a, b) => {
    if (a.programs.position !== b.programs.position) {
      return a.programs.position - b.programs.position;
    }
    if (a.stage !== b.stage) {
      return a.stage - b.stage;
    }
    return PROGRAM_LEVEL_ORDER[a.level] - PROGRAM_LEVEL_ORDER[b.level];
  });

  const placements: PlacementRow[] = sortedPlacements.map((placement) => ({
    id: placement.id,
    programId: placement.programs.id,
    programSlug: placement.programs.slug,
    programName: placement.programs.name,
    stage: placement.stage,
    level: placement.level,
    note: placement.note,
  }));

  const programs: ProgramOption[] = programsResult.data ?? [];
  const quiz = course.quizzes;

  // course_prerequisites tiene dos FK a courses: `!prerequisite_course_id` elige el requisito.
  const [prerequisitesResult, activeCoursesResult] = await Promise.all([
    supabase
      .from("course_prerequisites")
      .select("kind, prerequisite:courses!prerequisite_course_id(id, slug, title)")
      .eq("course_id", course.id),
    supabase.from("courses").select("id, title").eq("is_active", true).order("title"),
  ]);

  if (prerequisitesResult.error || activeCoursesResult.error) {
    throw new Error("No se pudieron cargar los requisitos del curso.");
  }

  const prerequisites: PrerequisiteRow[] = (prerequisitesResult.data ?? [])
    .map((row) => ({
      courseId: row.prerequisite.id,
      slug: row.prerequisite.slug,
      title: row.prerequisite.title,
      kind: row.kind,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const prerequisiteIds = new Set(prerequisites.map((prerequisite) => prerequisite.courseId));
  const prerequisiteOptions: CourseOption[] = (activeCoursesResult.data ?? []).filter(
    (option) => option.id !== course.id && !prerequisiteIds.has(option.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wider text-primary-bright uppercase">
          Curso · {course.slug}
        </p>
        <h2 className="font-heading text-2xl font-semibold text-balance">{course.title}</h2>
        <p className="text-sm text-muted-foreground">
          Revisa su disponibilidad, su quiz y las reglas con las que entra en las rutas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CourseStatusCard courseId={course.id} isActive={course.is_active} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Quiz
              {quiz?.is_active ? <Badge>Activo</Badge> : null}
              {quiz && !quiz.is_active ? <Badge variant="secondary">Inactivo</Badge> : null}
              {quiz ? null : <Badge variant="outline">Sin quiz</Badge>}
            </CardTitle>
            <CardDescription>
              Aprobarlo marca el curso como hecho en la ruta del alumno, igual que el botón «Hecho».
            </CardDescription>
            <CardAction>
              <Button
                variant="outline"
                render={<Link href={`/admin/courses/${encodeURIComponent(course.slug)}/quiz`} />}
                nativeButton={false}
              >
                <ExamIcon data-icon="inline-start" />
                {quiz ? "Editar quiz" : "Crear quiz"}
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      <CoursePlacements
        courseId={course.id}
        courseIsActive={course.is_active}
        placements={placements}
        programs={programs}
      />

      <CoursePrerequisites
        courseId={course.id}
        prerequisites={prerequisites}
        courseOptions={prerequisiteOptions}
        isAiEnabled={isAiConfigured()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Datos del curso</CardTitle>
          <CardDescription>
            Los cambios valen para las rutas nuevas. Las horas se leen en vivo: cambiarlas también
            cambia el avance de las rutas ya generadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm mode="edit" courseId={course.id} initialValues={initialValues} />
        </CardContent>
      </Card>
    </div>
  );
}
