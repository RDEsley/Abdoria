import type { UserRecord } from '../domain/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import {
  PATROL_LEGENDARY_WEAPON_IDS,
  PATROL_SECRET_WEAPON_IDS,
  PATROL_SPELL_IDS,
  SPELL_DUPLICATE_DORIAS,
  resolvePatrolArmas,
} from '../../../shared/patrol/shop.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import type { AfkEnemyTier } from '../types/index.js';
import {
  AFK_BOSS_LEGENDARY_WEAPON_ROLL,
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_LEGENDARY_ROLL_BOSS,
  AFK_LEGENDARY_ROLL_NORMAL,
  AFK_ROUTE_DRINK_DROP_THRESHOLD,
  AFK_SECRET_ROLL_EXACT,
  AFK_SECRET_WEAPON_GATE_MOD,
  AFK_SECRET_WEAPON_ROLL_EXACT,
  GOLDEN_SLIME_SECRET_COSMETIC_IDS,
  isExplorationLegendaryCosmeticDrop,
  type AfkPendingReward,
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

function pickLegendaryCosmeticId(user: UserRecord, killIndex: number): string | null {
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const candidates = COSMETICS.filter(
    (c) => !unlocked.has(c.id) && isExplorationLegendaryCosmeticDrop(c),
  );
  if (candidates.length === 0) return null;
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

/** Fonte única em shared/afk/combat.ts (calibrado para ~160h até a 1ª lendária). */
const BOSS_LEGENDARY_WEAPON_THRESHOLD = AFK_BOSS_LEGENDARY_WEAPON_ROLL;

/** 0,13% por derrota de boss — arco ou espada lendária (nível 9). */
export function rollBossLegendaryWeapon(
  user: UserRecord,
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

/** Arma Secret (nv. 10) — roll 9998 + portão 1/3 (~0,0033% na tabela vs 0,01% do título). */
function rollSecretPatrolWeapon(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  unlockedWeaponIds: Set<string>,
): void {
  const gate = hashKillSeed(String(user.id), killIndex + 8001) % AFK_SECRET_WEAPON_GATE_MOD;
  if (gate !== 0) return;

  const candidates = PATROL_SECRET_WEAPON_IDS.filter(
    (id) => !unlockedWeaponIds.has(id) && !pending.weapon_ids.includes(id),
  );
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 8002) % candidates.length;
  const weaponId = candidates[idx];
  if (!weaponId) return;

  pending.weapon_ids.push(weaponId);
}

/** Uma rolagem na tabela de loot da exploração (distribuição de raridade). */
export function rollLootTable(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  const roll = hashKillSeed(String(user.id), killIndex) % 10000;
  const legendaryThreshold = opts?.bossBoost ? AFK_LEGENDARY_ROLL_BOSS : AFK_LEGENDARY_ROLL_NORMAL;
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const unlockedWeapons = new Set(armas.desbloqueados);

  if (roll >= AFK_SECRET_ROLL_EXACT) {
    pending.titulo_secreto = true;
    return;
  }
  if (roll === AFK_SECRET_WEAPON_ROLL_EXACT) {
    rollSecretPatrolWeapon(user, killIndex, pending, unlockedWeapons);
    return;
  }
  if (roll >= legendaryThreshold) {
    const cosmeticId = pickLegendaryCosmeticId(user, killIndex);
    if (cosmeticId) pending.cosmetic_ids.push(cosmeticId);
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
  user: UserRecord,
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

function spellDropWeight(id: string): number {
  if (id === 'magia_agua') return 45;
  if (id === 'magia_terra') return 20;
  if (id === 'magia_gelo') return 16;
  if (id === 'magia_fogo') return 11;
  if (id === 'magia_relampago') return 6;
  if (id === 'magia_buraco_negro') return 2;
  return 1;
}

/** Peso do "sem drop" — quanto mais raras as magias restantes, menor a chance diária. */
const SPELL_NO_DROP_WEIGHT = 40;

/**
 * Drop do Slime Mágico. Regras:
 * - Cada magia só é conquistada uma vez: o pool nunca inclui magias já possuídas
 *   (nem já pendentes no baú) — progressão real rumo à coleção completa.
 * - No máximo UMA magia a cada 24h (dia SP), com chance proporcional à raridade
 *   restante: se só faltam as raras, o drop diário fica difícil de acontecer.
 * - Coleção completa: todo drop de magia vira SPELL_DUPLICATE_DORIAS automaticamente.
 */
export function rollMagicRabbitSpell(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const unlockedSpells = new Set(armas.desbloqueados);

  const spellsNotOwned = (PATROL_SPELL_IDS as readonly string[]).filter(
    (id) => !unlockedSpells.has(id) && !pending.weapon_ids.includes(id),
  );

  if (spellsNotOwned.length === 0) {
    pending.abdoria += SPELL_DUPLICATE_DORIAS;
    pending.drop_count = (pending.drop_count ?? 0) + 1;
    return;
  }

  const today = getTodaySaoPaulo();
  if (armas.ultimo_drop_magia === today) return;

  const weights = spellsNotOwned.map(spellDropWeight);
  const totalSpellWeight = weights.reduce((a, b) => a + b, 0);
  const roll =
    hashKillSeed(String(user.id), killIndex + 6666) % (totalSpellWeight + SPELL_NO_DROP_WEIGHT);
  if (roll >= totalSpellWeight) return;

  let cumulative = 0;
  for (let i = 0; i < spellsNotOwned.length; i++) {
    cumulative += weights[i] ?? 0;
    if (roll < cumulative) {
      const spellId = spellsNotOwned[i];
      if (spellId) {
        pending.weapon_ids.push(spellId);
        pending.drop_count = (pending.drop_count ?? 0) + 1;
        armas.ultimo_drop_magia = today;
        user.preferencias.patrol_armas = armas;
      }
      return;
    }
  }
}

/** @deprecated use rollKillDrop */
export function rollIntervalReward(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  rollLootTable(user, killIndex, pending, opts);
}

/** ~5 Route Drinks em 24h: roll % 10.000 < {@link AFK_ROUTE_DRINK_DROP_THRESHOLD}. */
export function rollRouteDrinkDrop(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const proc = hashKillSeed(String(user.id), killIndex + 5041) % 10000;
  if (proc >= AFK_ROUTE_DRINK_DROP_THRESHOLD) return;
  pending.route_drinks += 1;
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** Chance de drop por kill conforme tier; se acertar, usa a tabela de raridade. */
export function rollKillDrop(
  user: UserRecord,
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
