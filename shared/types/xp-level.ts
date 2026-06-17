/** XP necessário para sair do nível atual e ir ao próximo. */
export function xpRequiredForNextLevel(currentLevel: number): number {
  const level = Math.max(1, Math.floor(currentLevel));
  return 50 * level * level + 50 * level;
}

export function xpLevelFromTotal(totalXp: number): number {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (remaining >= xpRequiredForNextLevel(level)) {
    remaining -= xpRequiredForNextLevel(level);
    level += 1;
  }

  return level;
}

export interface XpLevelProgress {
  level: number;
  xpInLevel: number;
  xpToNext: number;
}

export function xpProgressFromTotal(totalXp: number): XpLevelProgress {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (remaining >= xpRequiredForNextLevel(level)) {
    remaining -= xpRequiredForNextLevel(level);
    level += 1;
  }

  return {
    level,
    xpInLevel: remaining,
    xpToNext: xpRequiredForNextLevel(level),
  };
}

/** XP gastável na loja: progresso do nível atual (0%–99%), sem cair de level. */
export function spendableXpForShop(totalXp: number): number {
  const { xpInLevel, xpToNext } = xpProgressFromTotal(totalXp);
  const cap = Math.floor((xpToNext * 99) / 100);
  return Math.min(xpInLevel, cap);
}

export function xpFloorForCurrentLevel(totalXp: number): number {
  const { level } = xpProgressFromTotal(totalXp);
  let floor = 0;
  for (let current = 1; current < level; current += 1) {
    floor += xpRequiredForNextLevel(current);
  }
  return floor;
}
