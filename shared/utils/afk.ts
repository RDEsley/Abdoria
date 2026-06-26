import { AFK_KILLS_PER_MINUTE } from '../afk/combat.js';
import {
  AFK_KILL_DROP_CHANCES,
  AFK_KILL_DROP_CHANCE,
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_MAX_MINUTES,
  type AfkKillDropChances,
} from '../types/index.js';

export {
  AFK_KILL_DROP_CHANCES,
  AFK_KILL_DROP_CHANCE,
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_MAX_MINUTES,
};
export type { AfkKillDropChances };

export function afkCapReached(minutos: number): boolean {
  return minutos >= AFK_MAX_MINUTES;
}

/** Minutos exibidos no timer (nunca acima do teto de 24h). */
export function afkDisplayMinutes(minutos: number, elapsedSinceSyncMin = 0): number {
  if (afkCapReached(minutos)) return AFK_MAX_MINUTES;
  const raw = minutos + Math.max(0, elapsedSinceSyncMin);
  return Math.min(raw, AFK_MAX_MINUTES);
}

/** Progresso 0–1 até o teto de 24h de patrulha. */
export function afkProgressToCap(minutos: number, elapsedSinceSyncMin = 0): number {
  const display = afkDisplayMinutes(minutos, elapsedSinceSyncMin);
  return Math.min(1, display / AFK_MAX_MINUTES);
}

export function formatAfkTimer(minutos: number): string {
  const capped = Math.min(Math.max(0, minutos), AFK_MAX_MINUTES);
  const totalSec = Math.floor(capped * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function afkKillsForHours(hours: number): number {
  return Math.floor(hours * 60 * AFK_KILLS_PER_MINUTE);
}

export function buildAfkMetaFields(minutos: number) {
  return {
    kill_drop_chance: AFK_KILL_DROP_CHANCE_COMMON,
    kill_drop_chances: AFK_KILL_DROP_CHANCES,
    max_minutes: AFK_MAX_MINUTES,
    capped: afkCapReached(minutos),
  };
}
