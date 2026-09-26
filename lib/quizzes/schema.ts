import { z } from "zod";

// Lo comparten el formulario del admin, su action y el seed (data/quizzes.json): una pregunta que
// no pasa acá tampoco la acepta el panel.

export const MAX_QUIZ_QUESTIONS = 20;
export const DEFAULT_PASS_PERCENTAGE = 60;

function requiredText(maxLength: number, requiredMessage: string) {
  return z
    .string()
    .trim()
    .min(1, { error: requiredMessage })
    .max(maxLength, { error: `Como máximo ${maxLength} caracteres.` });
}

const optionSchema = requiredText(240, "Completa las cuatro opciones.");

export const quizQuestionSchema = z.object({
  // Estable al editar; la action le pone crypto.randomUUID() a las preguntas nuevas.
  id: z.string().min(1).max(100),
  prompt: requiredText(500, "Escribe la pregunta."),
  options: z
    .tuple([optionSchema, optionSchema, optionSchema, optionSchema])
    .refine((options) => new Set(options).size === options.length, {
      error: "Las cuatro opciones deben ser distintas.",
    }),
  correctOption: z
    .number({ error: "Elige la opción correcta." })
    .int()
    .min(0, { error: "Elige la opción correcta." })
    .max(3, { error: "Elige la opción correcta." }),
  explanation: requiredText(500, "Explica por qué esa es la respuesta correcta."),
});

// `quizzes.questions` llega de Supabase como `Json` sin tipo: se valida en vez de castear.
export const storedQuestionsSchema = z.array(quizQuestionSchema);

function questionListSchema<Question extends z.ZodType>(questionSchema: Question) {
  return z
    .array(questionSchema)
    .min(1, { error: "El quiz necesita al menos una pregunta." })
    .max(MAX_QUIZ_QUESTIONS, { error: `Como máximo ${MAX_QUIZ_QUESTIONS} preguntas.` });
}

export const courseQuizFormSchema = z.object({
  questions: questionListSchema(quizQuestionSchema),
  passPercentage: z
    .number({ error: "Indica el porcentaje para aprobar." })
    .int({ error: "Usa un número entero." })
    .min(1, { error: "El porcentaje va de 1 a 100." })
    .max(100, { error: "El porcentaje va de 1 a 100." }),
  isActive: z.boolean(),
});

// Lo que manda el formulario del admin: una pregunta nueva llega con id vacío y saveCourseQuiz se
// lo pone. Todo lo demás se valida igual que un quiz guardado.
export const courseQuizDraftSchema = courseQuizFormSchema.extend({
  questions: questionListSchema(quizQuestionSchema.extend({ id: z.string().max(100) })),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type CourseQuizFormValues = z.infer<typeof courseQuizFormSchema>;
export type CourseQuizDraft = z.infer<typeof courseQuizDraftSchema>;

// Un quiz activo tal como lo recibe el diálogo, con las respuestas incluidas: el feedback se da al
// instante en el navegador y submit_quiz_attempt vuelve a corregir en Postgres.
export type CourseQuiz = {
  id: string;
  courseId: number;
  passPercentage: number;
  questions: QuizQuestion[];
};
