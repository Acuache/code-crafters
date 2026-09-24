import { describe, expect, it } from "vitest";

import { computeStreak, todayInTimeZone } from "./streak";

describe("computeStreak", () => {
  it("sin días, todo en cero", () => {
    expect(computeStreak([], "2026-09-23")).toEqual({ current: 0, best: 0, isActiveToday: false });
  });

  it("cuenta una racha que termina hoy", () => {
    expect(computeStreak(["2026-09-21", "2026-09-22", "2026-09-23"], "2026-09-23")).toEqual({
      current: 3,
      best: 3,
      isActiveToday: true,
    });
  });

  it("sigue viva si el último avance fue ayer, aunque hoy todavía no haya", () => {
    expect(computeStreak(["2026-09-21", "2026-09-22"], "2026-09-23")).toEqual({
      current: 2,
      best: 2,
      isActiveToday: false,
    });
  });

  it("se corta si el último avance fue hace dos días o más", () => {
    expect(computeStreak(["2026-09-20", "2026-09-21"], "2026-09-23")).toEqual({
      current: 0,
      best: 2,
      isActiveToday: false,
    });
  });

  it("la mejor racha es la más larga aunque no sea la actual", () => {
    expect(
      computeStreak(["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-22", "2026-09-23"], "2026-09-23"),
    ).toEqual({ current: 2, best: 3, isActiveToday: true });
  });

  it("ignora repetidos y el orden de entrada", () => {
    expect(computeStreak(["2026-09-23", "2026-09-21", "2026-09-22", "2026-09-22"], "2026-09-23"))
      .toMatchObject({ current: 3, best: 3 });
  });

  it("cruza fin de mes y fin de año", () => {
    expect(computeStreak(["2026-01-31", "2026-02-01"], "2026-02-01")).toMatchObject({ current: 2 });
    expect(computeStreak(["2025-12-31", "2026-01-01"], "2026-01-01")).toMatchObject({ current: 2 });
  });

  it("ignora fechas inválidas y futuras", () => {
    expect(computeStreak(["invalid", "2026-09-23", "2026-09-24"], "2026-09-23")).toEqual({
      current: 1,
      best: 1,
      isActiveToday: true,
    });
  });
});

describe("todayInTimeZone", () => {
  // 2026-09-23 a las 23:30 en Lima es 2026-09-24 a las 13:30 en Tokio.
  const fixedInstant = new Date("2026-09-24T04:30:00Z");

  it("da la fecha local de cada zona", () => {
    expect(todayInTimeZone("America/Lima", fixedInstant)).toBe("2026-09-23");
    expect(todayInTimeZone("Asia/Tokyo", fixedInstant)).toBe("2026-09-24");
  });

  it("una zona inválida cae a UTC", () => {
    expect(todayInTimeZone("Marte/Olympus", fixedInstant)).toBe("2026-09-24");
  });
});
