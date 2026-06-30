import { AFK_ENEMIES, AFK_GOLDEN_SLIME_ABDORIA, type AfkEnemyId } from './combat.js';
import { PATROL_LEGENDARY_WEAPON_IDS, PATROL_SECRET_WEAPON_IDS, PATROL_SPELL_IDS } from '../patrol/shop.js';

export type BestiaryPendingLike = {
  xp: number;
  abdoria: number;
  frozen_streaks: number;
  route_drinks: number;
  exp_instant?: number;
  doria_bags?: number;
  cosmetic_ids: string[];
  weapon_ids: string[];
  titulo_secreto: boolean;
};

export type BestiaryDropId =
  | 'xp'
  | 'abdoria'
  | 'abdoria_golden'
  | 'doria_bag'
  | 'exp_instant'
  | 'frozen_streak'
  | 'route_drink'
  | 'cosmetic_legendary'
  | 'cosmetic_secret'
  | 'titulo_secreto'
  | 'weapon_legendary'
  | 'weapon_secret'
  | 'weapon_spell';

export interface BestiaryDropDefinition {
  id: BestiaryDropId;
  label: string;
  /** Chance aproximada do drop, já formatada para exibição. */
  chance: string;
}

/**
 * Chance aproximada por drop (rótulo pronto para UI).
 * Itens comuns refletem a banda na tabela de loot; itens raros, o roll dedicado.
 */
const BESTIARY_DROP_CHANCE: Record<BestiaryDropId, string> = {
  xp: '85%',
  abdoria: '8%',
  abdoria_golden: '100%',
  doria_bag: '2%',
  exp_instant: '5%',
  frozen_streak: '20%',
  route_drink: '0,04%',
  cosmetic_legendary: '0,03%',
  cosmetic_secret: '0,01%',
  titulo_secreto: '0,01%',
  weapon_legendary: '0,13%',
  weapon_secret: '0,003%',
  weapon_spell: '100%',
};

const COMMON_ELITE_DROPS: BestiaryDropId[] = [
  'xp',
  'abdoria',
  'doria_bag',
  'exp_instant',
  'frozen_streak',
  'route_drink',
  'cosmetic_legendary',
  'titulo_secreto',
  'weapon_secret',
];

const BOSS_EXTRA_DROPS: BestiaryDropId[] = ['weapon_legendary'];

const GOLDEN_SLIME_DROPS: BestiaryDropId[] = ['abdoria_golden', 'cosmetic_secret', 'route_drink'];
const MAGIC_RABBIT_DROPS: BestiaryDropId[] = ['weapon_spell'];

export function bestiaryDropsForEnemy(enemyId: AfkEnemyId): BestiaryDropId[] {
  if (enemyId === 'golden_slime') return [...GOLDEN_SLIME_DROPS];
  if (enemyId === 'magic_rabbit') return [...MAGIC_RABBIT_DROPS];
  const tier = AFK_ENEMIES[enemyId]?.tier ?? 'common';
  if (tier === 'boss') return [...COMMON_ELITE_DROPS, ...BOSS_EXTRA_DROPS];
  return [...COMMON_ELITE_DROPS];
}

export function buildBestiaryDropCatalog(currencyName: string): Record<BestiaryDropId, BestiaryDropDefinition> {
  const def = (id: BestiaryDropId, label: string): BestiaryDropDefinition => ({
    id,
    label,
    chance: BESTIARY_DROP_CHANCE[id],
  });
  return {
    xp: def('xp', '+1 XP'),
    abdoria: def('abdoria', `+1 ${currencyName}`),
    abdoria_golden: def('abdoria_golden', `+${AFK_GOLDEN_SLIME_ABDORIA} ${currencyName}`),
    doria_bag: def('doria_bag', 'Bolsa de Dorias'),
    exp_instant: def('exp_instant', 'EXP Instantâneo'),
    frozen_streak: def('frozen_streak', 'Frozen Streak'),
    route_drink: def('route_drink', 'Route Drink'),
    cosmetic_legendary: def('cosmetic_legendary', 'Cosmético lendário'),
    cosmetic_secret: def('cosmetic_secret', 'Cosmético secreto'),
    titulo_secreto: def('titulo_secreto', 'Título secreto'),
    weapon_legendary: def('weapon_legendary', 'Arma lendária'),
    weapon_secret: def('weapon_secret', 'Arma Secret'),
    weapon_spell: def('weapon_spell', 'Magia'),
  };
}

export type BestiaryPendingSnapshot = {
  xp: number;
  abdoria: number;
  frozen_streaks: number;
  route_drinks: number;
  exp_instant: number;
  doria_bags: number;
  cosmetic_ids: string[];
  weapon_ids: string[];
  titulo_secreto: boolean;
};

export function snapshotBestiaryPending(pending: BestiaryPendingLike): BestiaryPendingSnapshot {
  return {
    xp: pending.xp,
    abdoria: pending.abdoria,
    frozen_streaks: pending.frozen_streaks,
    route_drinks: pending.route_drinks,
    exp_instant: pending.exp_instant ?? 0,
    doria_bags: pending.doria_bags ?? 0,
    cosmetic_ids: [...pending.cosmetic_ids],
    weapon_ids: [...pending.weapon_ids],
    titulo_secreto: pending.titulo_secreto,
  };
}

export function inferBestiaryDropsFromKill(
  enemyId: AfkEnemyId,
  before: BestiaryPendingSnapshot,
  after: BestiaryPendingSnapshot,
): BestiaryDropId[] {
  const found: BestiaryDropId[] = [];

  if (enemyId === 'golden_slime') {
    if (after.abdoria > before.abdoria) found.push('abdoria_golden');
    if (after.cosmetic_ids.length > before.cosmetic_ids.length) found.push('cosmetic_secret');
    if (after.route_drinks > before.route_drinks) found.push('route_drink');
    return found;
  }

  if (enemyId === 'magic_rabbit') {
    const newWeaponIds = after.weapon_ids.filter((id) => !before.weapon_ids.includes(id));
    if (newWeaponIds.some((id) => (PATROL_SPELL_IDS as readonly string[]).includes(id))) {
      found.push('weapon_spell');
    }
    return found;
  }

  if (after.xp > before.xp) found.push('xp');
  if (after.abdoria > before.abdoria) found.push('abdoria');
  if (after.doria_bags > before.doria_bags) found.push('doria_bag');
  if (after.exp_instant > before.exp_instant) found.push('exp_instant');
  if (after.frozen_streaks > before.frozen_streaks) found.push('frozen_streak');
  if (after.route_drinks > before.route_drinks) found.push('route_drink');
  if (after.cosmetic_ids.length > before.cosmetic_ids.length) found.push('cosmetic_legendary');
  if (after.titulo_secreto && !before.titulo_secreto) found.push('titulo_secreto');

  const newWeaponIds = after.weapon_ids.filter((id) => !before.weapon_ids.includes(id));
  if (newWeaponIds.some((id) => (PATROL_SECRET_WEAPON_IDS as readonly string[]).includes(id))) {
    found.push('weapon_secret');
  }
  if (newWeaponIds.some((id) => (PATROL_LEGENDARY_WEAPON_IDS as readonly string[]).includes(id))) {
    found.push('weapon_legendary');
  }

  return found;
}

export type BestiaryDropDiscoveryMap = Partial<Record<AfkEnemyId, BestiaryDropId[]>>;

export function mergeBestiaryDropDiscoveries(
  current: BestiaryDropDiscoveryMap | undefined,
  enemyId: AfkEnemyId,
  dropIds: BestiaryDropId[],
): BestiaryDropDiscoveryMap {
  if (dropIds.length === 0) return current ?? {};
  const next: BestiaryDropDiscoveryMap = { ...(current ?? {}) };
  const merged = new Set([...(next[enemyId] ?? []), ...dropIds]);
  next[enemyId] = [...merged];
  return next;
}
