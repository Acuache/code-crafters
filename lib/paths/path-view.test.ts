import { describe, expect, it } from "vitest";

import { buildPathView, type PathViewInput } from "./path-view";

const course = (id: number, title: string) => ({
  id,
  slug: `course-${id}`,
  title,
  summary: `${title} summary`,
  hours: 10,
  chapters: ["Introducción"],
  url: `https://example.com/${id}`,
});

const basePath: PathViewInput["path"] = {
  id: "path-1",
  title: "Ruta de prueba",
  summary: "Resumen",
  budget_hours: 40,
};

describe("buildPathView", () => {
  it("derives progress, unlock order, bonuses and discarded steps", () => {
    const view = buildPathView({
      path: basePath,
      steps: [
        { id: "3", stage: 3, position: 1, origin: "recomendado", reason: "r", status: "pending", discard_reason: null, courses: course(3, "Tres") },
        { id: "1", stage: 1, position: 1, origin: "requerido", reason: "r", status: "done", discard_reason: null, courses: course(1, "Uno") },
        { id: "discard", stage: 5, position: 1, origin: "recomendado", reason: "r", status: "discarded", discard_reason: "Ya dominás este contenido", courses: course(5, "Fuera") },
        { id: "bonus", stage: 4, position: 1, origin: "opcional", reason: "r", status: "pending", discard_reason: null, courses: course(4, "Bonus") },
        { id: "2", stage: 2, position: 1, origin: "requerido", reason: "r", status: "pending", discard_reason: null, courses: course(2, "Dos") },
      ],
    });

    expect(view.mainSteps.map((step) => step.uiStatus)).toEqual(["done", "available", "locked"]);
    expect(view.mainSteps.map((step) => step.id)).toEqual(["1", "2", "3"]);
    expect(view.bonusSteps).toHaveLength(1);
    expect(view.discardedSteps[0].discardReason).toBe("Ya dominás este contenido");
    expect(view.progressPercentage).toBe(33);
  });

  it("returns zero progress for a path without active main steps", () => {
    const view = buildPathView({ path: basePath, steps: [] });
    expect(view.progressPercentage).toBe(0);
    expect(view.totalHours).toBe(0);
  });

  it("preserves an explicit in-progress status", () => {
    const view = buildPathView({
      path: basePath,
      steps: [
        { id: "1", stage: 1, position: 1, origin: "requerido", reason: "r", status: "in_progress", discard_reason: null, courses: course(1, "Uno") },
        { id: "2", stage: 2, position: 1, origin: "requerido", reason: "r", status: "pending", discard_reason: null, courses: course(2, "Dos") },
      ],
    });
    expect(view.mainSteps.map((step) => step.uiStatus)).toEqual(["in_progress", "locked"]);
  });
});
