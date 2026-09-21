import { describe, expect, it } from "vitest";

import { assessmentAnswersSchema } from "./quiz-schema";

const validAnswers = {
  goal: "react-nest",
  level: "empiezo_de_cero",
  masteredTechnologies: ["javascript", "git"],
  interests: ["docker", "testing"],
  hoursPerWeek: 10,
  deadlineMonths: 6,
  freeText: "Sé HTML y CSS pero nunca toqué backend.",
};

describe("assessmentAnswersSchema", () => {
  it("parsea el ejemplo de referencia del spec", () => {
    expect(assessmentAnswersSchema.safeParse(validAnswers).success).toBe(true);
  });

  it("rechaza un goal que no existe en GOALS con un mensaje legible", () => {
    const result = assessmentAnswersSchema.safeParse({ ...validAnswers, goal: "kotlin" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // El mensaje por defecto de zod para z.enum() lista las 19 opciones de GOALS
      // ("Invalid option: expected one of ..."); acá se verifica que no vuelva a filtrarse.
      expect(result.error.issues[0]?.message).toBe("Elegí una meta para continuar.");
    }
  });

  it("rechaza hoursPerWeek fuera del rango 3-40", () => {
    const result = assessmentAnswersSchema.safeParse({ ...validAnswers, hoursPerWeek: 41 });
    expect(result.success).toBe(false);
  });

  it("rechaza freeText de más de 500 caracteres", () => {
    const result = assessmentAnswersSchema.safeParse({
      ...validAnswers,
      freeText: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
