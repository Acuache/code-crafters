import { describe, expect, it } from "vitest";

import { courseXp, levelFromXp, xpRequiredForLevel } from "./xp";

describe("courseXp", () => {
  it("da 10 XP por hora de curso", () => {
    expect(courseXp(10)).toBe(100);
  });

  it("redondea las horas con decimales", () => {
    expect(courseXp(2.5)).toBe(25);
    expect(courseXp(1.26)).toBe(13);
  });
});

describe("xpRequiredForLevel", () => {
  it("sigue la curva 0 / 100 / 300 / 600 / 1000 para los niveles 1 a 5", () => {
    const curve = [1, 2, 3, 4, 5].map(xpRequiredForLevel);

    expect(curve).toEqual([0, 100, 300, 600, 1000]);
  });
});

describe("levelFromXp", () => {
  it("sin XP es nivel 1 con 0 / 100", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  });

  it("justo en el umbral sube de nivel y arranca en 0", () => {
    expect(levelFromXp(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 200 });
  });

  it("un XP antes del umbral sigue en el nivel anterior", () => {
    expect(levelFromXp(99)).toEqual({ level: 1, xpIntoLevel: 99, xpForNextLevel: 100 });
  });

  it("muestra el XP dentro del nivel sobre el costo de ese nivel", () => {
    expect(levelFromXp(1200)).toEqual({ level: 5, xpIntoLevel: 200, xpForNextLevel: 500 });
  });

  it("un XP negativo no baja del nivel 1", () => {
    expect(levelFromXp(-50)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  });
});
