export const XP_PER_HOUR = 10;

// Pasar del nivel n al n + 1 cuesta 100 × n XP.
const XP_COST_PER_LEVEL = 100;

export type LevelProgress = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

export function courseXp(hours: number): number {
  return Math.round(hours * XP_PER_HOUR);
}

// Acumulado: 0 → nivel 1, 100 → 2, 300 → 3, 600 → 4, 1000 → 5.
export function xpRequiredForLevel(level: number): number {
  return (XP_COST_PER_LEVEL / 2) * level * (level - 1);
}

export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, totalXp);

  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }

  return {
    level,
    xpIntoLevel: xp - xpRequiredForLevel(level),
    xpForNextLevel: XP_COST_PER_LEVEL * level,
  };
}
