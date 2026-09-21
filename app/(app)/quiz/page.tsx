import { Eyebrow } from "@/components/brand/eyebrow";
import { QuizForm } from "@/components/quiz/quiz-form";
import { requireUser } from "@/lib/supabase/guards";

export default async function QuizPage() {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Eyebrow>Cuestionario</Eyebrow>
        <h1 className="text-display max-w-xl text-balance">Contanos qué querés aprender</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Seis pasos rápidos. Con esto armamos la base de tu ruta de aprendizaje.
        </p>
      </div>
      <QuizForm />
    </div>
  );
}
