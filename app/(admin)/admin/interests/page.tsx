import {
  InterestCourses,
  type InterestCourseOption,
  type InterestCourseRow,
} from "@/components/admin/interest-courses";
import { INTERESTS } from "@/lib/paths/interests";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export default async function AdminInterestsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [interestCoursesResult, activeCoursesResult] = await Promise.all([
    supabase
      .from("interest_courses")
      .select("interest_slug, position, courses(id, slug, title, in_construction)")
      .order("position"),
    supabase.from("courses").select("id, title").eq("is_active", true).order("title"),
  ]);

  if (interestCoursesResult.error || activeCoursesResult.error) {
    throw new Error("No se pudieron cargar los intereses.");
  }

  const activeCourses: InterestCourseOption[] = activeCoursesResult.data ?? [];

  const interests = Object.entries(INTERESTS).map(([interestSlug, interest]) => {
    const courses: InterestCourseRow[] = (interestCoursesResult.data ?? [])
      .filter((row) => row.interest_slug === interestSlug)
      .map((row) => ({
        courseId: row.courses.id,
        slug: row.courses.slug,
        title: row.courses.title,
        inConstruction: row.courses.in_construction,
      }));
    const takenIds = new Set(courses.map((course) => course.courseId));
    const courseOptions = activeCourses.filter((course) => !takenIds.has(course.id));

    return { interestSlug, label: interest.label, courses, courseOptions };
  });

  return (
    <section className="flex flex-col gap-6" aria-labelledby="interests-heading">
      <div className="flex flex-col gap-1">
        <h2 id="interests-heading" className="font-heading text-2xl font-semibold">
          Intereses
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Los cursos que suma cada interés del cuestionario, en orden de preferencia. El motor solo
          suma un curso si la ruta ya tiene lo que ese curso necesita.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {interests.map((interest) => (
          <InterestCourses
            key={interest.interestSlug}
            interestSlug={interest.interestSlug}
            label={interest.label}
            courses={interest.courses}
            courseOptions={interest.courseOptions}
          />
        ))}
      </div>
    </section>
  );
}
