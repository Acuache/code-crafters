import { describe, expect, it } from "vitest";

import { findNextStep, type NextStepCandidate } from "./next-step";

describe("findNextStep", () => {
  it("un in_progress gana sobre un pending con stage menor", () => {
    const steps: NextStepCandidate[] = [
      { status: "pending", stage: 1, position: 1, courseTitle: "Fundamentos" },
      { status: "in_progress", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)).toEqual({ courseTitle: "React", status: "in_progress" });
  });

  it("sin in_progress, devuelve el pending de menor stage y position", () => {
    const steps: NextStepCandidate[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "pending", stage: 2, position: 2, courseTitle: "Next.js" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
      { status: "pending", stage: 3, position: 1, courseTitle: "Testing" },
    ];

    expect(findNextStep(steps)).toEqual({ courseTitle: "React", status: "pending" });
  });

  it("una entrada desordenada da el mismo resultado que una ordenada", () => {
    const orderedSteps: NextStepCandidate[] = [
      { status: "done", stage: 1, position: 1, courseTitle: "Git" },
      { status: "pending", stage: 1, position: 2, courseTitle: "JavaScript" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
    ];
    const shuffledSteps = [orderedSteps[2], orderedSteps[0], orderedSteps[1]];

    expect(findNextStep(shuffledSteps)).toEqual(findNextStep(orderedSteps));
    expect(findNextStep(shuffledSteps)).toEqual({
      courseTitle: "JavaScript",
      status: "pending",
    });
  });

  it("ignora los pasos descartados", () => {
    const steps: NextStepCandidate[] = [
      { status: "discarded", stage: 1, position: 1, courseTitle: "Angular" },
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
    ];

    expect(findNextStep(steps)).toEqual({ courseTitle: "React", status: "pending" });
  });

  it("devuelve null cuando todo está hecho o descartado", () => {
    const steps: NextStepCandidate[] = [
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
    const steps: NextStepCandidate[] = [
      { status: "pending", stage: 2, position: 1, courseTitle: "React" },
      { status: "pending", stage: 1, position: 1, courseTitle: "Git" },
    ];
    const snapshotBefore = structuredClone(steps);

    findNextStep(steps);

    expect(steps).toEqual(snapshotBefore);
  });
});
