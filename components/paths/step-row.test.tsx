// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PathStepView } from "./path-step";
import { StepRow } from "./step-row";

afterEach(cleanup);

// Pendiente y con quiz: con acciones de dueño mostraría el toggle, "Quitar" y el quiz.
const step: PathStepView = {
  id: "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b",
  stage: 1,
  position: 1,
  origin: "requerido",
  reason: "Es la base de la ruta",
  status: "pending",
  discardReason: null,
  courseTitle: "Curso de React",
  courseHours: 12,
  courseUrl: "https://cursos.devtalles.com/courses/react",
  courseImageUrl: null,
  quiz: { id: "quiz-1", courseId: 1, passPercentage: 60, questions: [] },
  programSlug: "react",
  programName: "React",
};

function renderRow(ownerActions?: Parameters<typeof StepRow>[0]["ownerActions"]) {
  render(
    <ol>
      <StepRow step={step} stepNumber={1} ownerActions={ownerActions} />
    </ol>,
  );
}

describe("StepRow", () => {
  it("con acciones de dueño muestra el toggle, el quiz y Quitar", () => {
    renderRow({ onStatusChange: vi.fn(), onDiscard: vi.fn(), onOpenQuiz: vi.fn() });

    expect(screen.getByLabelText("Estado de Curso de React")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Rendir quiz/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Quitar/ })).toBeTruthy();
  });

  it("sin acciones de dueño no renderiza el toggle y deja solo Ver curso", () => {
    renderRow();

    expect(screen.queryByLabelText("Estado de Curso de React")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rendir quiz/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
    // Base UI le pone role="button" al <a> de "Ver curso".
    expect(screen.getByRole("button", { name: "Ver curso" })).toBeTruthy();
  });
});
