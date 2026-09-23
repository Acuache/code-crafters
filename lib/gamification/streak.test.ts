import { describe, expect, it } from "vitest";

import { deriveStreak } from "./streak";

describe("deriveStreak", () => {
  it("counts a consecutive streak ending today", () => {
    expect(deriveStreak(["2026-09-21", "2026-09-22", "2026-09-23"], "2026-09-23"))
      .toEqual({ current: 3, best: 3 });
  });

  it("reports no current streak when today has no activity", () => {
    expect(deriveStreak(["2026-09-20", "2026-09-22"], "2026-09-23"))
      .toEqual({ current: 0, best: 1 });
  });

  it("deduplicates and sorts out-of-order dates", () => {
    expect(deriveStreak(["2026-09-23", "2026-09-21", "2026-09-22", "2026-09-22"], "2026-09-23"))
      .toEqual({ current: 3, best: 3 });
  });

  it("keeps the historical best after a skipped day", () => {
    expect(deriveStreak(["2026-09-18", "2026-09-19", "2026-09-21", "2026-09-23"], "2026-09-23"))
      .toEqual({ current: 1, best: 2 });
  });

  it("ignores invalid and future date keys", () => {
    expect(deriveStreak(["invalid", "2026-09-23", "2026-09-24"], "2026-09-23"))
      .toEqual({ current: 1, best: 1 });
  });
});
