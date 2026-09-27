import { describe, expect, it } from "vitest";

import { describeTimeUntil, nextPersonalizationAt, remainingPersonalizations } from "./daily-limit";

describe("remainingPersonalizations", () => {
  it.each([
    [0, 5],
    [4, 1],
    [5, 0],
    [7, 0],
  ])("con %i usos quedan %i", (used, expected) => {
    expect(remainingPersonalizations(used)).toBe(expected);
  });
});

describe("nextPersonalizationAt", () => {
  it("libera el uso 24 h después del más viejo", () => {
    expect(nextPersonalizationAt(new Date("2026-09-26T19:26:42Z")).toISOString()).toBe(
      "2026-09-27T19:26:42.000Z",
    );
  });
});

describe("describeTimeUntil", () => {
  const now = new Date("2026-09-27T14:49:07Z");

  it.each([
    ["2026-09-27T19:26:42Z", "4 h 38 min"],
    ["2026-09-27T15:14:00Z", "25 min"],
    ["2026-09-27T16:49:07Z", "2 h"],
    ["2026-09-27T14:49:07Z", "1 min"],
  ])("hasta %s faltan %s", (retryAt, expected) => {
    expect(describeTimeUntil(new Date(retryAt), now)).toBe(expected);
  });
});
