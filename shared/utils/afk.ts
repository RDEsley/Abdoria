import { AFK_KILLS_PER_MINUTE } from '../afk/combat.js';
import {
  AFK_KILL_DROP_CHANCES,
  AFK_KILL_DROP_CHANCE,
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_MAX_MINUTES,
  type AfkKillDropChances,
  type AfkPendingReward,
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

/** Progresso 0–1 até o teto de 24h de exploração. */
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

function hasAfkPendingLoot(pending: AfkPendingReward): boolean {
  return (
    pending.xp > 0
    || pending.abdoria > 0
    || pending.frozen_streaks > 0
    || pending.route_drinks > 0
    || pending.exp_instant > 0
    || pending.doria_bags > 0
    || pending.cosmetic_ids.length > 0
    || (pending.weapon_ids?.length ?? 0) > 0
    || pending.titulo_secreto
  );
}

/** Baú de exploração tem loot pendente para coletar. */
export function hasAfkRewardsToClaim(
  afk: { pending?: AfkPendingReward | null } | AfkPendingReward | null | undefined,
): boolean {
  if (!afk) return false;
  const pending = 'pending' in afk ? afk.pending : afk;
  if (!pending || typeof pending !== 'object' || !('xp' in pending)) return false;
  return hasAfkPendingLoot(pending);
}

/** Quantidade de eventos de drop (cada kill que gerou loot conta 1). */
export function countAfkDropEvents(pending: AfkPendingReward | null | undefined): number {
  if (!pending || !hasAfkPendingLoot(pending)) return 0;

  const tracked = pending.drop_count ?? 0;
  if (tracked > 0) return tracked;

  return (
    pending.xp
    + pending.frozen_streaks
    + pending.route_drinks
    + pending.cosmetic_ids.length
    + (pending.titulo_secreto ? 1 : 0)
    + pending.abdoria
  );
}
