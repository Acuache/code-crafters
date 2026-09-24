import { describe, expect, it } from "vitest";

import { findNextStep, type NextStepCandidate } from "./next-step";

type Step = NextStepCandidate & { courseTitle: string };

describe("findNextStep", () => {
  it("un in_progress gana sobre un pending con stage menor", () => {
    const steps: Step[] = [
      { status: "pending", stage: 1, position: 1, courseTitle: "Fundamentos" },
      { status: "in_progress", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)?.courseTitle).toBe("React");
  });

  it("sin in_progress, devuelve el pending de menor stage y position", () => {
    const steps: Step[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "pending", stage: 2, position: 2, courseTitle: "Next.js" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
      { status: "pending", stage: 3, position: 1, courseTitle: "Testing" },
    ];

    expect(findNextStep(steps)?.courseTitle).toBe("React");
  });

  it("devuelve el mismo objeto que recibió, con todos sus campos", () => {
    const steps: Step[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)).toBe(steps[1]);
  });

  it("una entrada desordenada da el mismo resultado que una ordenada", () => {
    const orderedSteps: Step[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "pending", stage: 1, position: 2, courseTitle: "JavaScript" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
    ];
    const shuffledSteps = [orderedSteps[2], orderedSteps[0], orderedSteps[1]];

    expect(findNextStep(shuffledSteps)).toBe(findNextStep(orderedSteps));
    expect(findNextStep(shuffledSteps)?.courseTitle).toBe("JavaScript");
  });

  it("ignora los pasos descartados", () => {
    const steps: Step[] = [
      { status: "discarded", stage: 1, position: 1, courseTitle: "Angular" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)?.courseTitle).toBe("React");
  });

  it("devuelve null cuando todo está hecho o descartado", () => {
    const steps: Step[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "discarded", stage: 1, position: 2, courseTitle: "Angular" },
      { status: "done", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)).toBeNull();
  });

  it("devuelve null con un arreglo vacío", () => {
    expect(findNextStep([])).toBeNull();
  });

  it("no muta la entrada", () => {
    const steps: Step[] = [
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
      { status: "pending", stage: 1, position: 1, courseTitle: "Git" },
    ];
    const snapshotBefore = structuredClone(steps);

    findNextStep(steps);

    expect(steps).toEqual(snapshotBefore);
  });
});
