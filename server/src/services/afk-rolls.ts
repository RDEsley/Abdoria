import type { UserDocument } from '../domain/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import type { AfkEnemyTier } from '../types/index.js';
import {
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_LEGENDARY_ROLL_BOSS,
  AFK_LEGENDARY_ROLL_NORMAL,
  type AfkPendingReward,
  type CosmeticRarity,
} from '../types/index.js';

export function hashKillSeed(userId: string, killIndex: number): number {
  let h = 2166136261;
  const s = `${userId}:${killIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** @deprecated use hashKillSeed */
export const hashIntervalSeed = hashKillSeed;

function pickLegendaryCosmeticId(user: UserDocument, killIndex: number): string | null {
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const candidates = COSMETICS.filter(
    (c) => c.raridade === 'lendario' && !unlocked.has(c.id) && c.unlock.tipo === 'moedas',
  );
  if (candidates.length === 0) {
    const anyLegendary = COSMETICS.filter(
      (c) => (c.raridade as CosmeticRarity) === 'lendario' && !unlocked.has(c.id),
    );
    if (anyLegendary.length === 0) return null;
    const idx = hashKillSeed(String(user.id), killIndex) % anyLegendary.length;
    return anyLegendary[idx]?.id ?? null;
  }
  const idx = hashKillSeed(String(user.id), killIndex) % candidates.length;
  return candidates[idx]?.id ?? null;
}

export interface RollLootOptions {
  bossBoost?: boolean;
  tier?: AfkEnemyTier;
}

export function getKillDropChanceForTier(tier: AfkEnemyTier): number {
  if (tier === 'boss') return AFK_KILL_DROP_CHANCE_BOSS;
  if (tier === 'elite') return AFK_KILL_DROP_CHANCE_ELITE;
  return AFK_KILL_DROP_CHANCE_COMMON;
}

/** Uma rolagem na tabela de loot da patrulha (distribuição de raridade). */
export function rollLootTable(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  const roll = hashKillSeed(String(user.id), killIndex) % 10000;
  const legendaryThreshold = opts?.bossBoost ? AFK_LEGENDARY_ROLL_BOSS : AFK_LEGENDARY_ROLL_NORMAL;

  if (roll >= 9999) {
    pending.titulo_secreto = true;
    return;
  }
  if (roll >= legendaryThreshold) {
    const cosmeticId = pickLegendaryCosmeticId(user, killIndex);
    if (cosmeticId) pending.cosmetic_ids.push(cosmeticId);
    return;
  }
  if (roll >= 9600) {
    pending.energy_drinks += 1;
    return;
  }
  if (roll >= 8500) {
    pending.abdoria += 1;
    return;
  }
  pending.xp += 1;
}

/** @deprecated use rollKillDrop */
export function rollIntervalReward(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  rollLootTable(user, killIndex, pending, opts);
}

/** Chance de drop por kill conforme tier; se acertar, usa a tabela de raridade. */
export function rollKillDrop(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  const tier = opts?.tier ?? 'common';
  const threshold = getKillDropChanceForTier(tier);
  const proc = hashKillSeed(String(user.id), killIndex) % 100;
  if (proc >= threshold) return;
  rollLootTable(user, killIndex, pending, opts);
}
