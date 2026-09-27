import { describe, expect, it } from "vitest";

import type { CourseDifficulty } from "@/lib/paths/types";

import { groupStepsByTier } from "./group-steps";

function makeStep(id: string, stage: number, courseDifficulty: CourseDifficulty) {
  return { id, stage, courseDifficulty };
}

function idsByGroup(groups: ReturnType<typeof groupStepsByTier>) {
  return groups.map((group) => ({
    key: group.key,
    ids: group.steps.map((step) => (step as ReturnType<typeof makeStep>).id),
  }));
}

describe("groupStepsByTier", () => {
  it("abre un tramo nuevo cada vez que la ruta alcanza una dificultad mayor", () => {
    const groups = groupStepsByTier([
      makeStep("programacion", 1, "principiante"),
      makeStep("javascript", 2, "principiante"),
      makeStep("react", 3, "intermedio"),
      makeStep("react-pro", 4, "avanzado"),
    ]);

    expect(idsByGroup(groups)).toEqual([
      { key: "primeros-pasos", ids: ["programacion", "javascript"] },
      { key: "intermedio", ids: ["react"] },
      { key: "avanzado", ids: ["react-pro"] },
    ]);
    expect(groups.map((group) => group.tierNumber)).toEqual([1, 2, 3]);
  });

  it("no retrocede: un curso de principiante después de uno avanzado queda en Avanzado", () => {
    const groups = groupStepsByTier([
      makeStep("java", 1, "principiante"),
      makeStep("java-avanzado", 2, "avanzado"),
      makeStep("git", 3, "principiante"),
    ]);

    expect(idsByGroup(groups)).toEqual([
      { key: "primeros-pasos", ids: ["java"] },
      { key: "avanzado", ids: ["java-avanzado", "git"] },
    ]);
  });

  it("no parte una etapa: toma el tramo de su curso más difícil", () => {
    const groups = groupStepsByTier([
      makeStep("programacion", 1, "principiante"),
      makeStep("typescript", 2, "principiante"),
      makeStep("react", 2, "intermedio"),
    ]);

    expect(idsByGroup(groups)).toEqual([
      { key: "primeros-pasos", ids: ["programacion"] },
      { key: "intermedio", ids: ["typescript", "react"] },
    ]);
  });

  it("una ruta que arranca en Intermedio empieza por ese tramo", () => {
    const groups = groupStepsByTier([makeStep("nest", 1, "intermedio")]);

    expect(groups).toEqual([
      {
        key: "intermedio",
        title: "Intermedio",
        tierNumber: 1,
        steps: [makeStep("nest", 1, "intermedio")],
      },
    ]);
  });

  it("sin pasos no hay tramos", () => {
    expect(groupStepsByTier([])).toEqual([]);
  });
});
