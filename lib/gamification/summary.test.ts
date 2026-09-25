import { describe, expect, it } from "vitest";

import type { PathStepStatus } from "@/lib/progress/path-progress";

import {
  celebrateStepChange,
  mainCelebration,
  summarizeGamification,
  type CelebrationEvents,
  type GamificationInput,
  type GamificationPath,
  type GamificationStep,
} from "./summary";

const TODAY = "2026-09-25";
const YESTERDAY = "2026-09-24";

function step(
  id: string,
  courseId: number,
  status: PathStepStatus,
  hours: number,
): GamificationStep {
  return { id, courseId, status, hours };
}

function path(id: string, steps: GamificationStep[]): GamificationPath {
  return { id, steps };
}

function input(paths: GamificationPath[], activityDays: string[] = []): GamificationInput {
  return { paths, activityDays, today: TODAY };
}

describe("summarizeGamification", () => {
  it("sin rutas ni avance, nivel 1 con 0 XP y sin insignias", () => {
    const summary = summarizeGamification(input([]));

    expect(summary.totalXp).toBe(0);
    expect(summary.level).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
    expect(summary.streak).toEqual({ current: 0, best: 0, isActiveToday: false });
    expect(summary.earned).toEqual([]);
  });

  it("un curso hecho en dos rutas suma una sola vez", () => {
    const summary = summarizeGamification(
      input([
        path("ruta-a", [step("a1", 1, "done", 10)]),
        path("ruta-b", [step("b1", 1, "done", 10)]),
      ]),
    );

    expect(summary.totalXp).toBe(100);
    expect(summary.stats.completedCourses).toBe(1);
    expect(summary.stats.completedHours).toBe(10);
  });

  it("un paso descartado no suma XP ni horas", () => {
    const summary = summarizeGamification(
      input([path("ruta-a", [step("a1", 1, "done", 10), step("a2", 2, "discarded", 30)])]),
    );

    expect(summary.totalXp).toBe(100);
    expect(summary.stats.completedHours).toBe(10);
  });

  it("redondea el XP de cada curso antes de sumarlo", () => {
    const summary = summarizeGamification(
      input([path("ruta-a", [step("a1", 1, "done", 2.25), step("a2", 2, "done", 2.25)])]),
    );

    // round(22.5) + round(22.5) = 23 + 23, no round(45)
    expect(summary.totalXp).toBe(46);
  });

  it("suma las horas hechas sin residuos de coma flotante", () => {
    const summary = summarizeGamification(
      input([path("ruta-a", [step("a1", 1, "done", 0.1), step("a2", 2, "done", 0.2)])]),
    );

    expect(summary.stats.completedHours).toBe(0.3);
  });

  it("una ruta con un paso hecho y uno descartado cuenta como completa", () => {
    const summary = summarizeGamification(
      input([path("ruta-a", [step("a1", 1, "done", 10), step("a2", 2, "discarded", 5)])]),
    );

    expect(summary.completedPathIds).toEqual(["ruta-a"]);
    expect(summary.stats.completedPaths).toBe(1);
  });

  it("una ruta sin pasos vigentes no cuenta como completa", () => {
    const summary = summarizeGamification(
      input([path("solo-descartes", [step("a1", 1, "discarded", 10)]), path("vacia", [])]),
    );

    expect(summary.completedPathIds).toEqual([]);
  });

  it("una ruta con un paso en curso no está completa", () => {
    const summary = summarizeGamification(
      input([path("ruta-a", [step("a1", 1, "done", 10), step("a2", 2, "in_progress", 5)])]),
    );

    expect(summary.completedPathIds).toEqual([]);
  });

  it("cuenta las rutas creadas y la mejor racha para las insignias", () => {
    const activityDays = [
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      YESTERDAY,
      TODAY,
    ];
    const summary = summarizeGamification(
      input([path("a", []), path("b", []), path("c", [])], activityDays),
    );

    expect(summary.stats.createdPaths).toBe(3);
    expect(summary.stats.bestStreak).toBe(7);
    expect(summary.earned).toEqual(["first-step", "explorer", "consistency"]);
  });
});

describe("celebrateStepChange", () => {
  it("al marcar Hecho da el XP del curso", () => {
    const before = input(
      [path("ruta-a", [step("a1", 1, "in_progress", 5), step("a2", 2, "pending", 5)])],
      [TODAY],
    );

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a1",
      status: "done",
      recordedActivityDay: true,
    });

    expect(events.completedCourse).toEqual({ gainedXp: 50 });
    expect(events.completedPathId).toBeNull();
    expect(events.levelUp).toBeNull();
    expect(events.newAchievements).toEqual(["first-course"]);
  });

  it("detecta la subida de nivel solo cuando cruza el umbral", () => {
    const before = input(
      [
        path("ruta-a", [
          step("a1", 1, "done", 9),
          step("a2", 2, "pending", 1),
          step("a3", 3, "pending", 1),
        ]),
      ],
      [TODAY],
    );

    const reachesLevelTwo = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a2",
      status: "done",
      recordedActivityDay: true,
    });

    expect(reachesLevelTwo.levelUp).toBe(2);

    const beforeAtLevelTwo = input(
      [
        path("ruta-a", [
          step("a1", 1, "done", 9),
          step("a2", 2, "done", 1),
          step("a3", 3, "pending", 1),
        ]),
      ],
      [TODAY],
    );
    const staysAtLevelTwo = celebrateStepChange(beforeAtLevelTwo, {
      pathId: "ruta-a",
      stepId: "a3",
      status: "done",
      recordedActivityDay: true,
    });

    expect(staysAtLevelTwo.levelUp).toBeNull();
  });

  it("detecta la ruta completada solo con el último paso vigente", () => {
    const before = input(
      [
        path("ruta-a", [
          step("a1", 1, "done", 5),
          step("a2", 2, "pending", 5),
          step("a3", 3, "discarded", 5),
        ]),
      ],
      [TODAY],
    );

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a2",
      status: "done",
      recordedActivityDay: true,
    });

    expect(events.completedPathId).toBe("ruta-a");
    expect(events.newAchievements).toEqual(["path-complete"]);
  });

  it("no vuelve a celebrar una insignia que ya estaba ganada", () => {
    const before = input(
      [
        path("ruta-a", [
          step("a1", 1, "done", 5),
          step("a2", 2, "pending", 5),
          step("a3", 3, "pending", 5),
        ]),
      ],
      [TODAY],
    );

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a2",
      status: "done",
      recordedActivityDay: true,
    });

    expect(events.newAchievements).toEqual([]);
    expect(events.completedPathId).toBeNull();
  });

  it("da gainedXp 0 cuando el curso ya contaba por otra ruta", () => {
    const before = input(
      [
        path("ruta-a", [step("a1", 1, "done", 10)]),
        path("ruta-b", [step("b1", 1, "in_progress", 10), step("b2", 2, "pending", 5)]),
      ],
      [TODAY],
    );

    const events = celebrateStepChange(before, {
      pathId: "ruta-b",
      stepId: "b1",
      status: "done",
      recordedActivityDay: true,
    });

    expect(events.completedCourse).toEqual({ gainedXp: 0 });
  });

  it("no celebra nada cuando el paso ya estaba hecho", () => {
    const before = input([path("ruta-a", [step("a1", 1, "done", 10)])], [TODAY]);

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a1",
      status: "done",
      recordedActivityDay: true,
    });

    expect(events).toEqual({
      completedCourse: null,
      completedPathId: null,
      levelUp: null,
      newAchievements: [],
    });
    expect(mainCelebration(events)).toBeNull();
  });

  it("el primer paso a En curso da Primer paso sin completedCourse", () => {
    const before = input([path("ruta-a", [step("a1", 1, "pending", 10)])]);

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a1",
      status: "in_progress",
      recordedActivityDay: true,
    });

    expect(events.completedCourse).toBeNull();
    expect(events.newAchievements).toEqual(["first-step"]);
  });

  it("sin registro del día no suma hoy a la racha", () => {
    const before = input([path("ruta-a", [step("a1", 1, "pending", 10)])]);

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a1",
      status: "in_progress",
      recordedActivityDay: false,
    });

    expect(events.newAchievements).toEqual([]);
  });

  it("el séptimo día seguido da Constancia al pasar a En curso", () => {
    const sixDays = [
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      YESTERDAY,
    ];
    const before = input([path("ruta-a", [step("a1", 1, "pending", 10)])], sixDays);

    const events = celebrateStepChange(before, {
      pathId: "ruta-a",
      stepId: "a1",
      status: "in_progress",
      recordedActivityDay: true,
    });

    expect(events.newAchievements).toEqual(["consistency"]);
  });

  it("no celebra nada si el paso no está en la ruta indicada", () => {
    const before = input([path("ruta-a", [step("a1", 1, "pending", 10)])]);

    const events = celebrateStepChange(before, {
      pathId: "ruta-b",
      stepId: "a1",
      status: "done",
      recordedActivityDay: true,
    });

    expect(mainCelebration(events)).toBeNull();
    expect(events.completedCourse).toBeNull();
  });
});

describe("mainCelebration", () => {
  const nothing: CelebrationEvents = {
    completedCourse: null,
    completedPathId: null,
    levelUp: null,
    newAchievements: [],
  };

  it("sin logros mayores no hay modal, aunque haya XP", () => {
    expect(mainCelebration({ ...nothing, completedCourse: { gainedXp: 50 } })).toBeNull();
  });

  it("la ruta completa gana sobre el nivel y las insignias", () => {
    const events: CelebrationEvents = {
      completedCourse: { gainedXp: 100 },
      completedPathId: "ruta-a",
      levelUp: 3,
      newAchievements: ["path-complete"],
    };

    expect(mainCelebration(events)).toBe("path-complete");
  });

  it("el nivel gana sobre las insignias", () => {
    expect(mainCelebration({ ...nothing, levelUp: 2, newAchievements: ["first-course"] })).toBe(
      "level-up",
    );
  });

  it("una insignia sola también abre el modal", () => {
    expect(mainCelebration({ ...nothing, newAchievements: ["first-step"] })).toBe("achievement");
  });
});
