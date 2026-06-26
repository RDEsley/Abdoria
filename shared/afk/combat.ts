export type AfkEnemyTier = 'common' | 'elite' | 'boss';

export type AfkEnemyId =
  | 'bat'
  | 'zombie'
  | 'skeleton'
  | 'armored_skeleton'
  | 'demon_bat'
  | 'slime_knight'
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

export const AFK_HERO_DAMAGE_ARCO = 14;
export const AFK_HERO_DAMAGE_ESPADA = 22;
export const AFK_KILLS_PER_MINUTE = 8;
export const AFK_BOSS_INTERVAL = 100;
export const AFK_ELITE_CHANCE = 12;
export const AFK_LEGENDARY_ROLL_NORMAL = 9995;
export const AFK_LEGENDARY_ROLL_BOSS = 9991;

export const AFK_ENEMIES: Record<AfkEnemyId, AfkEnemyDefinition> = {
  bat: { id: 'bat', tier: 'common', maxHp: 24, label: 'Slime Morcego' },
  zombie: { id: 'zombie', tier: 'common', maxHp: 40, label: 'Slime Musgo' },
  skeleton: { id: 'skeleton', tier: 'common', maxHp: 52, label: 'Slime Ósseo' },
  armored_skeleton: { id: 'armored_skeleton', tier: 'elite', maxHp: 90, label: 'Slime Blindado' },
  demon_bat: { id: 'demon_bat', tier: 'elite', maxHp: 110, label: 'Slime Demoníaco' },
  slime_knight: { id: 'slime_knight', tier: 'elite', maxHp: 130, label: 'Slime Cavaleiro' },
  boss_colossus: { id: 'boss_colossus', tier: 'boss', maxHp: 280, label: 'Mega Slime Colosso' },
  boss_lich: { id: 'boss_lich', tier: 'boss', maxHp: 320, label: 'Slime Lich' },
  boss_hydra: { id: 'boss_hydra', tier: 'boss', maxHp: 360, label: 'Hidra Slime' },
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

export function pickNextEnemy(
  seed: number,
  opts: { isBoss: boolean; isElite: boolean },
): { enemy_id: AfkEnemyId; elite: boolean; is_boss: boolean } {
  if (opts.isBoss) {
    const idx = seed % BOSS_ENEMIES.length;
    const enemy_id = BOSS_ENEMIES[idx] ?? 'boss_colossus';
    return { enemy_id, elite: false, is_boss: true };
  }

  const elite = opts.isElite;
  if (elite) {
    const idx = seed % ELITE_ENEMIES.length;
    const enemy_id = ELITE_ENEMIES[idx] ?? 'armored_skeleton';
    return { enemy_id, elite: true, is_boss: false };
  }

  const idx = seed % COMMON_ENEMIES.length;
  const enemy_id = COMMON_ENEMIES[idx] ?? 'bat';
  return { enemy_id, elite: false, is_boss: false };
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
