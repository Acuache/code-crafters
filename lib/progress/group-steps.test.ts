import { describe, expect, it } from "vitest";

import type { StepOrigin } from "@/lib/paths/types";

import { groupStepsByProgram } from "./group-steps";

function makeStep(id: string, origin: StepOrigin, programSlug: string | null) {
  return {
    id,
    origin,
    programSlug,
    programName: programSlug ? `Programa ${programSlug}` : null,
  };
}

describe("groupStepsByProgram", () => {
  it("agrupa por programa en el orden en que aparecen los pasos", () => {
    const groups = groupStepsByProgram([
      makeStep("1", "requerido", "fundamentos"),
      makeStep("2", "requerido", "react"),
      makeStep("3", "recomendado", "fundamentos"),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["fundamentos", "react"]);
    expect(groups[0].steps.map((step) => step.id)).toEqual(["1", "3"]);
    expect(groups[0].title).toBe("Programa fundamentos");
  });

  it("deja los pasos de interés en un grupo propio, al final", () => {
    const groups = groupStepsByProgram([
      makeStep("1", "interes", null),
      makeStep("2", "requerido", "react"),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["react", "intereses"]);
    expect(groups[1].isInterestGroup).toBe(true);
    expect(groups[1].steps.map((step) => step.id)).toEqual(["1"]);
  });

  it("junta en 'Otros cursos' los pasos oficiales sin programa", () => {
    const groups = groupStepsByProgram([makeStep("1", "opcional", null)]);

    expect(groups).toEqual([
      {
        key: "sin-programa",
        title: "Otros cursos",
        isInterestGroup: false,
        steps: [makeStep("1", "opcional", null)],
      },
    ]);
  });

  it("no crea el grupo de intereses si no hay pasos de interés", () => {
    const groups = groupStepsByProgram([makeStep("1", "requerido", "react")]);

    expect(groups.some((group) => group.isInterestGroup)).toBe(false);
  });
});
