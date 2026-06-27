import type { AfkPendingReward } from '../types/index.js';

/** Janela de 24h de exploração acumulada para rolar Frozen Streak. */
export const AFK_FROZEN_STREAK_WINDOW_MINUTES = 24 * 60;

/** ~20% de chance de 1 Frozen Streak por janela de 24h (0 ou 1, nunca mais). */
export const AFK_FROZEN_STREAK_DROP_THRESHOLD = 2000;

export function hashFrozenStreakSeed(userId: string, windowIndex: number): number {
  let h = 2166136261;
  const s = `frozen:${userId}:${windowIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Rola 0 ou 1 Frozen Streak por cada bloco completo de 24h de exploração.
 * `prevMinutes` / `totalMinutes` = minutos acumulados antes e depois do sync.
 */
export function rollFrozenStreakForExplorationMinutes(
  userId: string,
  prevMinutes: number,
  totalMinutes: number,
  pending: AfkPendingReward,
): void {
  const prevWindows = Math.floor(Math.max(0, prevMinutes) / AFK_FROZEN_STREAK_WINDOW_MINUTES);
  const totalWindows = Math.floor(Math.max(0, totalMinutes) / AFK_FROZEN_STREAK_WINDOW_MINUTES);

  for (let window = prevWindows; window < totalWindows; window += 1) {
    const roll = hashFrozenStreakSeed(userId, window) % 10000;
    if (roll >= AFK_FROZEN_STREAK_DROP_THRESHOLD) continue;
    pending.frozen_streaks = (pending.frozen_streaks ?? 0) + 1;
  }
}
