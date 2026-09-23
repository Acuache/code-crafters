import { describe, expect, it } from "vitest";

import { GENERIC_SAVE_ERROR, describePostgresError } from "./postgres-errors";

function uniqueViolation(constraintName: string) {
  return {
    code: "23505",
    message: `duplicate key value violates unique constraint "${constraintName}"`,
  };
}

describe("describePostgresError", () => {
  it("traduce cada unique conocido a su mensaje", () => {
    expect(describePostgresError(uniqueViolation("courses_slug_key"))).toBe(
      "Ya existe un curso con ese slug.",
    );
    expect(describePostgresError(uniqueViolation("programs_slug_key"))).toBe(
      "Ya existe un programa con ese slug.",
    );
    expect(
      describePostgresError(uniqueViolation("program_courses_program_id_course_id_key")),
    ).toBe("Este curso ya está en ese programa.");
    expect(
      describePostgresError(uniqueViolation("program_courses_program_id_stage_level_position_key")),
    ).toBe("Otro cambio ocupó esa posición. Intentá de nuevo.");
  });

  it("un unique desconocido o cualquier otro error da el mensaje genérico", () => {
    expect(describePostgresError(uniqueViolation("otro_key"))).toBe(GENERIC_SAVE_ERROR);
    expect(describePostgresError({ code: "42501", message: "permission denied" })).toBe(
      GENERIC_SAVE_ERROR,
    );
  });
});
