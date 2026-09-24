// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StreakCard } from "./streak-card";

afterEach(cleanup);

describe("StreakCard", () => {
  it("muestra la racha, el récord y los siete días reales", () => {
    render(
      <StreakCard
        streak={{ current: 3, best: 5, isActiveToday: true }}
        activityDates={["2026-09-21", "2026-09-23"]}
        today="2026-09-23"
      />,
    );

    expect(screen.getByText("3 días")).toBeTruthy();
    expect(screen.getByText("Racha actual · récord 5 días")).toBeTruthy();
    expect(screen.getAllByTestId("streak-day")).toHaveLength(7);
    expect(screen.getAllByLabelText(/con avance/)).toHaveLength(2);
  });
});
