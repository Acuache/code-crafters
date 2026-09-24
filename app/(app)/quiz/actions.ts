"use server";

import { assessmentAnswersSchema } from "@/components/quiz/quiz-schema";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export type SaveAssessmentResult =
  { ok: true; assessmentId: string } | { ok: false; message: string };

// `answers` entra como `unknown` y se revalida acá con el mismo schema que el cliente, aunque el
// cliente ya haya validado: esta server action es un endpoint público y el `user_id` lo pone
// requireUser(), nunca el payload recibido.
export async function saveAssessment(answers: unknown): Promise<SaveAssessmentResult> {
  const result = assessmentAnswersSchema.safeParse(answers);

  if (!result.success) {
    return { ok: false, message: "Las respuestas no son válidas." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assessments")
    .insert({ user_id: user.userId, answers: result.data })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "No se pudo guardar el cuestionario. Probá de nuevo." };
  }

  return { ok: true, assessmentId: data.id };
}
