import { describe, expect, it } from "vitest";

import { remainingPersonalizations } from "./daily-limit";

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
