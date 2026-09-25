import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS, earnedAchievementIds, type AchievementStats } from "./achievements";

const NO_PROGRESS: AchievementStats = {
  hasAnyActivity: false,
  completedCourses: 0,
  completedPaths: 0,
  createdPaths: 0,
  bestStreak: 0,
  completedHours: 0,
};

describe("ACHIEVEMENTS", () => {
  it("tiene 6 insignias con ids distintos", () => {
    const ids = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));

    expect(ACHIEVEMENTS).toHaveLength(6);
    expect(ids.size).toBe(6);
  });
});

describe("earnedAchievementIds", () => {
  it("sin avance no da ninguna insignia", () => {
    expect(earnedAchievementIds(NO_PROGRESS)).toEqual([]);
  });

  it("da todas justo en el umbral, en el orden del catálogo", () => {
    const stats: AchievementStats = {
      hasAnyActivity: true,
      completedCourses: 1,
      completedPaths: 1,
      createdPaths: 3,
      bestStreak: 7,
      completedHours: 50,
    };

    expect(earnedAchievementIds(stats)).toEqual([
      "first-step",
      "first-course",
      "path-complete",
      "explorer",
      "consistency",
      "marathoner",
    ]);
  });

  it("no da las de umbral un punto antes de llegar", () => {
    const stats: AchievementStats = {
      ...NO_PROGRESS,
      createdPaths: 2,
      bestStreak: 6,
      completedHours: 49.9,
    };

    expect(earnedAchievementIds(stats)).toEqual([]);
  });
});
