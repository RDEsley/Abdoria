import type { UserDocument } from '../domain/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import { PATROL_LEGENDARY_WEAPON_IDS } from '../../../shared/patrol/shop.js';
import type { AfkEnemyTier } from '../types/index.js';
import {
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_LEGENDARY_ROLL_BOSS,
  AFK_LEGENDARY_ROLL_NORMAL,
  AFK_ROUTE_DRINK_DROP_CHANCE,
  AFK_SECRET_ROLL_EXACT,
  GOLDEN_SLIME_SECRET_COSMETIC_IDS,
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

/** Espelha {@link AFK_BOSS_LEGENDARY_WEAPON_ROLL} em shared/afk/combat.ts */
const BOSS_LEGENDARY_WEAPON_THRESHOLD = 9950;

/** 0,5% por derrota de boss — arco ou espada lendária (nível 9). */
export function rollBossLegendaryWeapon(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
  unlockedWeaponIds: Set<string>,
): void {
  const roll = hashKillSeed(String(user.id), killIndex + 9001) % 10000;
  if (roll < BOSS_LEGENDARY_WEAPON_THRESHOLD) return;

  const candidates = PATROL_LEGENDARY_WEAPON_IDS.filter((id: string) => !unlockedWeaponIds.has(id));
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 9002) % candidates.length;
  const weaponId = candidates[idx];
  if (!weaponId || pending.weapon_ids.includes(weaponId)) return;

  pending.weapon_ids.push(weaponId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** Uma rolagem na tabela de loot da exploração (distribuição de raridade). */
export function rollLootTable(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  const roll = hashKillSeed(String(user.id), killIndex) % 10000;
  const legendaryThreshold = opts?.bossBoost ? AFK_LEGENDARY_ROLL_BOSS : AFK_LEGENDARY_ROLL_NORMAL;

  if (roll >= AFK_SECRET_ROLL_EXACT) {
    pending.titulo_secreto = true;
    return;
  }
  if (roll >= legendaryThreshold) {
    const cosmeticId = pickLegendaryCosmeticId(user, killIndex);
    if (cosmeticId) pending.cosmetic_ids.push(cosmeticId);
    return;
  }
  if (roll >= 9700) {
    pending.energy_drinks += 1;
    return;
  }
  if (roll >= 9500) {
    pending.exp_instant = (pending.exp_instant ?? 0) + 1;
    return;
  }
  if (roll >= 9300) {
    pending.doria_bags = (pending.doria_bags ?? 0) + 1;
    return;
  }
  if (roll >= 8500) {
    pending.abdoria += 1;
    return;
  }
  pending.xp += 1;
}

/** Drop secreto do Golden Slime — mesma chance do título secreto (roll exato 9999). */
export function rollGoldenSlimeSecretCosmetic(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const roll = hashKillSeed(String(user.id), killIndex + 7777) % 10000;
  if (roll !== AFK_SECRET_ROLL_EXACT) return;

  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const ownedPending = new Set(pending.cosmetic_ids);
  const candidates = GOLDEN_SLIME_SECRET_COSMETIC_IDS.filter(
    (id: string) => !unlocked.has(id) && !ownedPending.has(id),
  );
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 7778) % candidates.length;
  const cosmeticId = candidates[idx];
  if (!cosmeticId) return;

  pending.cosmetic_ids.push(cosmeticId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
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

/** Chance fixa de 1% por kill de obter Route Drink no baú. */
export function rollRouteDrinkDrop(
  user: UserDocument,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const proc = hashKillSeed(String(user.id), killIndex + 5041) % 100;
  if (proc >= AFK_ROUTE_DRINK_DROP_CHANCE) return;
  pending.route_drinks += 1;
  pending.drop_count = (pending.drop_count ?? 0) + 1;
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
  pending.drop_count = (pending.drop_count ?? 0) + 1;
  rollLootTable(user, killIndex, pending, opts);
}
