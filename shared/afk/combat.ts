export type AfkEnemyTier = 'common' | 'elite' | 'boss';

export type AfkEnemyId =
  | 'bat'
  | 'zombie'
  | 'skeleton'
  | 'armored_skeleton'
  | 'demon_bat'
  | 'slime_knight'
  | 'golden_slime'
  | 'boss_colossus'
  | 'boss_lich'
  | 'boss_hydra';

export interface AfkEnemyDefinition {
  id: AfkEnemyId;
  tier: AfkEnemyTier;
  maxHp: number;
  label: string;
}

export interface AfkCombatState {
  kills_total: number;
  kills_until_boss: number;
  enemy_id: AfkEnemyId;
  enemy_hp: number;
  is_boss: boolean;
  elite: boolean;
}

export interface AfkCombatSnapshot {
  kills_total: number;
  kills_until_boss: number;
  kills_to_next_boss: number;
  enemy_id: AfkEnemyId;
  enemy_hp: number;
  enemy_max_hp: number;
  is_boss: boolean;
  elite: boolean;
  hero_damage_arco: number;
  hero_damage_espada: number;
}

export const AFK_HERO_DAMAGE_ARCO = 10;
export const AFK_HERO_DAMAGE_ESPADA = 12;
export const AFK_CRIT_CHANCE_ESPADA = 6;
export const AFK_CRIT_CHANCE_ARCO = 18;
export const AFK_CRIT_STREAK_STEP_ARCO = 4;
export const AFK_CRIT_BONUS_ESPADA = 4;
/** @deprecated Use {@link AFK_CRIT_STREAK_STEP_ARCO} — arcos acumulam +4 por crítico seguido. */
export const AFK_CRIT_BONUS_ARCO = AFK_CRIT_STREAK_STEP_ARCO;
/** @deprecated Arcos usam {@link AFK_CRIT_CHANCE_ARCO}. */
export const AFK_CRIT_CHANCE_ARCO_MULTIPLIER = 1.15;

/** @deprecated Use {@link AFK_CRIT_CHANCE_ESPADA}. */
export const AFK_CRIT_CHANCE = AFK_CRIT_CHANCE_ESPADA;

export type PatrolWeaponDamageKind = 'arco' | 'espada';

export function patrolCritChance(kind: PatrolWeaponDamageKind): number {
  return kind === 'arco' ? AFK_CRIT_CHANCE_ARCO : AFK_CRIT_CHANCE_ESPADA;
}

export function patrolCritBonus(kind: PatrolWeaponDamageKind): number {
  return kind === 'arco' ? AFK_CRIT_STREAK_STEP_ARCO : AFK_CRIT_BONUS_ESPADA;
}

export function patrolCritDamage(
  baseDamage: number,
  kind: PatrolWeaponDamageKind,
  critStreak = 0,
): number {
  if (kind === 'arco') {
    return baseDamage + AFK_CRIT_STREAK_STEP_ARCO * (critStreak + 1);
  }
  return baseDamage + AFK_CRIT_BONUS_ESPADA;
}

export function formatPatrolCritChancePercent(chance: number): string {
  const value = Math.round(chance * 10) / 10;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(/\.0$/, '')}%`;
}
export const AFK_KILLS_PER_MINUTE = 8;
export const AFK_BOSS_INTERVAL = 100;
export const AFK_ELITE_CHANCE = 12;
export const AFK_GOLDEN_SLIME_CHANCE = 5000;
export const AFK_GOLDEN_SLIME_ABDORIA = 99;
export const AFK_LEGENDARY_ROLL_NORMAL = 9995;
export const AFK_LEGENDARY_ROLL_BOSS = 9991;
/** 0,5% por kill de boss — rolagem em /10000 (9950–9999). */
export const AFK_BOSS_LEGENDARY_WEAPON_ROLL = 9950;

export const AFK_ENEMIES: Record<AfkEnemyId, AfkEnemyDefinition> = {
  bat: { id: 'bat', tier: 'common', maxHp: 42, label: 'Slime Morcego' },
  zombie: { id: 'zombie', tier: 'common', maxHp: 70, label: 'Slime Musgo' },
  skeleton: { id: 'skeleton', tier: 'common', maxHp: 90, label: 'Slime Ósseo' },
  armored_skeleton: { id: 'armored_skeleton', tier: 'elite', maxHp: 155, label: 'Slime Blindado' },
  demon_bat: { id: 'demon_bat', tier: 'elite', maxHp: 190, label: 'Slime Demoníaco' },
  slime_knight: { id: 'slime_knight', tier: 'elite', maxHp: 225, label: 'Slime Cavaleiro' },
  golden_slime: { id: 'golden_slime', tier: 'common', maxHp: 110, label: 'Golden Slime' },
  boss_colossus: { id: 'boss_colossus', tier: 'boss', maxHp: 490, label: 'Rei Slime' },
  boss_lich: { id: 'boss_lich', tier: 'boss', maxHp: 560, label: 'Slime Lich' },
  boss_hydra: { id: 'boss_hydra', tier: 'boss', maxHp: 630, label: 'Hidra Slime' },
};

const COMMON_ENEMIES: AfkEnemyId[] = ['bat', 'zombie', 'skeleton'];
const ELITE_ENEMIES: AfkEnemyId[] = ['armored_skeleton', 'demon_bat', 'slime_knight'];
const BOSS_ENEMIES: AfkEnemyId[] = ['boss_colossus', 'boss_lich', 'boss_hydra'];

export const DEFAULT_AFK_COMBAT: AfkCombatState = {
  kills_total: 0,
  kills_until_boss: 0,
  enemy_id: 'bat',
  enemy_hp: AFK_ENEMIES.bat.maxHp,
  is_boss: false,
  elite: false,
};

export function hashCombatSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getEnemyMaxHp(enemyId: AfkEnemyId): number {
  return AFK_ENEMIES[enemyId]?.maxHp ?? AFK_ENEMIES.bat.maxHp;
}

export interface AfkSpawnResult {
  enemy_id: AfkEnemyId;
  elite: boolean;
  is_boss: boolean;
}

function pickFromPool(
  pool: AfkEnemyId[],
  seed: number,
  previousEnemyId?: AfkEnemyId,
): AfkEnemyId {
  let idx = (seed >>> 8) % pool.length;
  if (pool.length > 1 && previousEnemyId && pool[idx] === previousEnemyId) {
    idx = (idx + 1 + ((seed >>> 16) % (pool.length - 1))) % pool.length;
  }
  return pool[idx] ?? pool[0]!;
}

export function shouldSpawnGoldenSlime(seed: number): boolean {
  return seed % AFK_GOLDEN_SLIME_CHANCE === 0;
}

export function pickNextEnemy(
  seed: number,
  opts: { isBoss: boolean; isElite: boolean; previousEnemyId?: AfkEnemyId },
): AfkSpawnResult {
  if (opts.isBoss) {
    const enemy_id = pickFromPool(BOSS_ENEMIES, seed, opts.previousEnemyId);
    return { enemy_id, elite: false, is_boss: true };
  }

  if (opts.isElite) {
    const enemy_id = pickFromPool(ELITE_ENEMIES, seed, opts.previousEnemyId);
    return { enemy_id, elite: true, is_boss: false };
  }

  const enemy_id = pickFromPool(COMMON_ENEMIES, seed, opts.previousEnemyId);
  return { enemy_id, elite: false, is_boss: false };
}

/** Spawn unificado (servidor + cliente) a partir do estado de combate. */
export function resolveNextSpawn(
  userId: string,
  killsUntilBoss: number,
  killsTotal: number,
  previousEnemyId?: AfkEnemyId,
): AfkSpawnResult {
  const isBoss = shouldSpawnBoss(killsUntilBoss);
  const seed = hashCombatSeed(`${userId}:${killsTotal}:spawn`);

  if (!isBoss && shouldSpawnGoldenSlime(seed)) {
    return { enemy_id: 'golden_slime', elite: false, is_boss: false };
  }

  const elite = !isBoss && shouldSpawnElite(seed);
  return pickNextEnemy(seed, { isBoss, isElite: elite, previousEnemyId });
}

export function shouldSpawnBoss(killsUntilBoss: number): boolean {
  return killsUntilBoss >= AFK_BOSS_INTERVAL - 1;
}

/** Espelha o incremento de kills_until_boss ao derrotar um inimigo (servidor + UI). */
export function advanceKillsUntilBoss(killsUntilBoss: number, wasBoss: boolean): number {
  if (wasBoss) return 0;
  const next = killsUntilBoss + 1;
  if (next >= AFK_BOSS_INTERVAL) return AFK_BOSS_INTERVAL - 1;
  return next;
}

export function shouldSpawnElite(seed: number): boolean {
  return seed % 100 < AFK_ELITE_CHANCE;
}

export function buildCombatSnapshot(state: AfkCombatState): AfkCombatSnapshot {
  const enemy_max_hp = getEnemyMaxHp(state.enemy_id);
  return {
    kills_total: state.kills_total,
    kills_until_boss: state.kills_until_boss,
    kills_to_next_boss: AFK_BOSS_INTERVAL - state.kills_until_boss,
    enemy_id: state.enemy_id,
    enemy_hp: Math.min(state.enemy_hp, enemy_max_hp),
    enemy_max_hp,
    is_boss: state.is_boss,
    elite: state.elite,
    hero_damage_arco: AFK_HERO_DAMAGE_ARCO,
    hero_damage_espada: AFK_HERO_DAMAGE_ESPADA,
  };
}
