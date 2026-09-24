// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StreakCard } from "./streak-card";

afterEach(cleanup);

describe("StreakCard", () => {
  it("shows current, best and seven real activity days", () => {
    render(<StreakCard current={3} best={5} activityDates={["2026-09-21", "2026-09-23"]} today="2026-09-23" />);
    expect(screen.getByText("3 días")).toBeTruthy();
    expect(screen.getByText("Récord: 5")).toBeTruthy();
    expect(screen.getAllByTestId("streak-day")).toHaveLength(7);
    expect(screen.getAllByLabelText(/Actividad el/)).toHaveLength(2);
  });
});
