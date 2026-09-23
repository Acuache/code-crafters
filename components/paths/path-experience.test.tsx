// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { PathStepView, PathView } from "@/lib/paths/path-view";
import { PathExperience } from "./path-experience";

const step = (id: string, title: string, uiStatus: PathStepView["uiStatus"], origin: PathStepView["origin"] = "requerido"): PathStepView => ({
  id, stage: Number(id.replace(/\D/g, "")) || 1, position: 1, origin, reason: "Elegido para tu meta",
  status: uiStatus === "done" ? "done" : "pending", uiStatus, discardReason: uiStatus === "discarded" ? "Ya dominás este contenido" : null,
  course: { id: Number(id.replace(/\D/g, "")) || 1, slug: id, title, summary: `Resumen de ${title}`, hours: 10, chapters: ["Introducción"], url: "https://example.com" },
});

const path: PathView = {
  id: "path", title: "Ruta Fullstack", summary: "Tu camino", budget_hours: 40,
  mainSteps: [step("1", "Curso completado", "done"), step("2", "Curso disponible", "available"), step("3", "Curso bloqueado", "locked")],
  bonusSteps: [step("bonus4", "Curso bonus", "available", "opcional")],
  discardedSteps: [step("discard5", "Curso descartado", "discarded")],
  progressPercentage: 33, totalHours: 40,
};

afterEach(cleanup);

describe("PathExperience", () => {
  it("renders progress states, bonuses and discarded reasons", () => {
    render(<PathExperience path={path} streak={{ current: 2, best: 4, activityDates: [] }} />);
    expect(screen.getByText("Completado")).toBeTruthy();
    expect(screen.getByText("Disponible")).toBeTruthy();
    expect(screen.getByText("Bloqueado")).toBeTruthy();
    expect(screen.getByText("Misiones bonus")).toBeTruthy();
    expect(screen.getByText("Ya dominás este contenido")).toBeTruthy();
  });

  it("updates the course detail when a step is selected", async () => {
    const user = userEvent.setup();
    render(<PathExperience path={path} streak={{ current: 2, best: 4, activityDates: [] }} />);
    await user.click(screen.getByRole("button", { name: /Curso bloqueado/ }));
    expect(screen.getByRole("heading", { name: "Curso bloqueado" })).toBeTruthy();
  });
});
