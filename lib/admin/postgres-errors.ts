// Traduce los errores de Postgres de las actions del panel (SPEC 10) a mensajes en español. El
// texto crudo del error nunca llega a la UI: nombra tablas y constraints internos.

export const GENERIC_SAVE_ERROR = "No se pudo guardar. Intenta de nuevo.";

const UNIQUE_VIOLATION_CODE = "23505";

// Nombres reales de los unique de los specs 02 y 13 (verificados en pg_constraint).
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  courses_slug_key: "Ya existe un curso con ese slug.",
  programs_slug_key: "Ya existe un programa con ese slug.",
  program_courses_program_id_course_id_key: "Este curso ya está en ese programa.",
  program_courses_program_id_stage_level_position_key:
    "Otro cambio ocupó esa posición. Intenta de nuevo.",
  quizzes_course_id_key: "Este curso ya tiene un quiz. Recarga la página para editarlo.",
};

export function describePostgresError(error: { code?: string; message: string }): string {
  if (error.code !== UNIQUE_VIOLATION_CODE) {
    return GENERIC_SAVE_ERROR;
  }

  // Postgres nombra el constraint entre comillas: `... violates unique constraint "courses_slug_key"`.
  for (const [constraintName, message] of Object.entries(UNIQUE_CONSTRAINT_MESSAGES)) {
    if (error.message.includes(`"${constraintName}"`)) {
      return message;
    }
  }

  return GENERIC_SAVE_ERROR;
}
