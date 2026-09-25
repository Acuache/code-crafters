import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import { QuizForm, QuizStatusCard, type SavedQuiz } from "@/components/admin/quiz-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decodeSlugParam } from "@/lib/admin/route-params";
import { MAX_QUIZ_QUESTIONS, storedQuestionsSchema } from "@/lib/quizzes/schema";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export default async function CourseQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();

  const { slug: slugParam } = await params;
  const slug = decodeSlugParam(slugParam);
  const supabase = await createClient();

  // Un curso tiene a lo sumo un quiz (unique en course_id). La RLS le deja ver al admin también
  // los desactivados.
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, slug, title, quizzes(id, is_active, pass_percentage, questions)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo cargar el quiz del curso.");
  }
  if (!course) {
    notFound();
  }

  let savedQuiz: SavedQuiz | null = null;
  if (course.quizzes) {
    const questions = storedQuestionsSchema.safeParse(course.quizzes.questions);
    if (!questions.success) {
      throw new Error("Las preguntas guardadas de este quiz no son válidas.");
    }

    savedQuiz = {
      id: course.quizzes.id,
      isActive: course.quizzes.is_active,
      passPercentage: course.quizzes.pass_percentage,
      questions: questions.data,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          render={<Link href={`/admin/courses/${encodeURIComponent(course.slug)}`} />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al curso
        </Button>
      </div>

      {savedQuiz ? <QuizStatusCard quizId={savedQuiz.id} isActive={savedQuiz.isActive} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Quiz de «{course.title}»</CardTitle>
          <CardDescription>
            {savedQuiz
              ? "Los cambios se ven en las rutas apenas los guardas. Los intentos anteriores conservan su puntaje."
              : `Este curso todavía no tiene quiz. Escribe entre 1 y ${MAX_QUIZ_QUESTIONS} preguntas de cuatro opciones.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizForm courseId={course.id} savedQuiz={savedQuiz} />
        </CardContent>
      </Card>
    </div>
  );
}
