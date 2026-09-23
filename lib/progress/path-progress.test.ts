import { describe, expect, it } from "vitest";

import {
  isUserDiscarded,
  summarizePathProgress,
  USER_DISCARD_REASON,
  type ProgressStep,
} from "./path-progress";

describe("summarizePathProgress", () => {
  it("no suma los pasos descartados ni a las horas vigentes ni a las hechas", () => {
    const steps: ProgressStep[] = [
      { status: "done", hours: 10 },
      { status: "pending", hours: 20 },
      { status: "discarded", hours: 40 },
    ];

    const progress = summarizePathProgress(steps, 100);

    expect(progress.activeHours).toBe(30);
    expect(progress.doneHours).toBe(10);
    expect(progress.activeCount).toBe(2);
    expect(progress.doneCount).toBe(1);
  });

  it("no suma un paso in_progress a las horas hechas", () => {
    const steps: ProgressStep[] = [
      { status: "in_progress", hours: 12 },
      { status: "done", hours: 8 },
    ];

    const progress = summarizePathProgress(steps, 100);

    expect(progress.doneHours).toBe(8);
    expect(progress.percentDone).toBe(40);
  });

  it("suma horas con decimales sin residuos de coma flotante", () => {
    const steps: ProgressStep[] = [
      { status: "done", hours: 8.5 },
      { status: "done", hours: 6.5 },
      { status: "pending", hours: 0.1 },
    ];

    const progress = summarizePathProgress(steps, 100);

    expect(progress.doneHours).toBe(15);
    expect(progress.activeHours).toBe(15.1);
  });

  it("da percentDone 0 sin NaN cuando no hay horas vigentes", () => {
    const steps: ProgressStep[] = [{ status: "discarded", hours: 10 }];

    const progress = summarizePathProgress(steps, 100);

    expect(progress.activeHours).toBe(0);
    expect(progress.percentDone).toBe(0);
  });

  it("con budgetHours null la ruta siempre cabe", () => {
    const steps: ProgressStep[] = [{ status: "pending", hours: 500 }];

    const progress = summarizePathProgress(steps, null);

    expect(progress.fitsInBudget).toBe(true);
    expect(progress.overflowHours).toBe(0);
  });

  it("calcula las horas de exceso cuando la ruta no cabe", () => {
    const steps: ProgressStep[] = [
      { status: "pending", hours: 150.5 },
      { status: "done", hours: 80 },
    ];

    const fitting = summarizePathProgress(steps, 230.5);
    const overflowing = summarizePathProgress(steps, 200);

    expect(fitting.fitsInBudget).toBe(true);
    expect(fitting.overflowHours).toBe(0);
    expect(overflowing.fitsInBudget).toBe(false);
    expect(overflowing.overflowHours).toBe(30.5);
  });
});

describe("isUserDiscarded", () => {
  it("reconoce un paso que quitó el usuario", () => {
    expect(isUserDiscarded({ status: "discarded", discardReason: USER_DISCARD_REASON })).toBe(true);
  });

  // Los tres motivos que escribe el motor (lib/paths/build-path.ts). Si el motor agrega uno nuevo
  // que coincida con USER_DISCARD_REASON, sus descartes se volverían restaurables: sumarlo acá.
  it.each(["ya lo dominás", "no cabía en tu tiempo", "superaba el cupo de intereses"])(
    "no considera del usuario un descarte del motor: %s",
    (engineReason) => {
      expect(isUserDiscarded({ status: "discarded", discardReason: engineReason })).toBe(false);
    },
  );

  it("no considera descartado un paso vigente aunque conserve el motivo", () => {
    expect(isUserDiscarded({ status: "pending", discardReason: USER_DISCARD_REASON })).toBe(false);
  });
});
