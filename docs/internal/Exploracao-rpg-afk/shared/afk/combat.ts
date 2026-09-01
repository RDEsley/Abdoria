export type AfkEnemyTier = 'common' | 'elite' | 'boss';

import { getAfkRegionById, type AfkRegionId } from './regions.js';

export type AfkEnemyId =
  | 'bat'
  | 'zombie'
  | 'skeleton'
  | 'slime_macaco'
  | 'slime_agua'
  | 'slime_doce'
  | 'slime_chocolate'
  | 'sand_slime'
  | 'lich_slime'
  | 'stone_slime'
  | 'clock_slime'
  | 'sleepy_slime'
  | 'dream_slime'
  | 'armored_skeleton'
  | 'crystal_slime'
  | 'storm_slime'
  | 'slime_knight'
  | 'slime_chumbo'
  | 'dune_brute'
  | 'necro_slime'
  | 'stone_guardian'
  | 'chronos_slime'
  | 'nightmare_slime'
  | 'golden_slime'
  | 'magic_rabbit'
  | 'slime_enigma'
  | 'slime_binario'
  | 'boss_colossus'
  | 'boss_crocodile'
  | 'boss_lich'
  | 'boss_hydra'
  | 'boss_golem'
  | 'boss_procrastinador'
  | 'boss_preguica';

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
  region_id?: import('./regions.js').AfkRegionId;
  region_progress?: Partial<Record<import('./regions.js').AfkRegionId, AfkRegionCombatProgress>>;
  unlocked_regions?: import('./regions.js').AfkRegionId[];
  hero_hp?: number;
  hero_defeated_until?: string | null;
  combat_last_at?: string | null;
  search_remaining_ms?: number;
  hero_attack_remaining_ms?: number;
  enemy_attack_remaining_ms?: number;
  defeated_remaining_ms?: number;
  orbs?: number;
  skill_nodes?: string[];
  skill_tree_free_reset_used?: boolean;
  adventure_started?: boolean;
  intro_seen?: boolean;
  slime_language_unlocked?: boolean;
  story_flags?: string[];
}

export interface AfkRegionCombatProgress {
  kills_until_boss: number;
  boss_defeated: boolean;
  boss_kills: number;
  orbs_earned: number;
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
  hero_damage_magia?: number;
  region_id: import('./regions.js').AfkRegionId;
  region_progress: Partial<Record<import('./regions.js').AfkRegionId, AfkRegionCombatProgress>>;
  unlocked_regions: import('./regions.js').AfkRegionId[];
  hero_hp: number;
  hero_max_hp: number;
  hero_defeated_until: string | null;
  search_remaining_ms?: number;
  hero_attack_remaining_ms?: number;
  enemy_attack_remaining_ms?: number;
  defeated_remaining_ms?: number;
  orbs: number;
  skill_nodes: string[];
  skill_tree_free_reset_used: boolean;
  adventure_started: boolean;
  intro_seen: boolean;
  slime_language_unlocked: boolean;
  story_flags: string[];
}

export const AFK_HERO_DAMAGE_ARCO = 10;
export const AFK_HERO_DAMAGE_ESPADA = 12;
export const AFK_CRIT_CHANCE_ESPADA = 6;
export const AFK_CRIT_CHANCE_ARCO = 18;
export const AFK_CRIT_STREAK_STEP_ARCO = 4;
export const AFK_CRIT_BONUS_ESPADA = 25;
/** @deprecated Use {@link AFK_CRIT_STREAK_STEP_ARCO} — arcos acumulam +4 por crítico seguido. */
export const AFK_CRIT_BONUS_ARCO = AFK_CRIT_STREAK_STEP_ARCO;
/** @deprecated Arcos usam {@link AFK_CRIT_CHANCE_ARCO}. */
export const AFK_CRIT_CHANCE_ARCO_MULTIPLIER = 1.15;

/** @deprecated Use {@link AFK_CRIT_CHANCE_ESPADA}. */
export const AFK_CRIT_CHANCE = AFK_CRIT_CHANCE_ESPADA;

export type PatrolWeaponDamageKind = 'arco' | 'espada' | 'magia';

export function patrolCritChance(kind: PatrolWeaponDamageKind): number {
  // Magias têm dano fixo alto e não criticam.
  if (kind === 'magia') return 0;
  return kind === 'arco' ? AFK_CRIT_CHANCE_ARCO : AFK_CRIT_CHANCE_ESPADA;
}

export function patrolCritBonus(kind: PatrolWeaponDamageKind): number {
  if (kind === 'magia') return 0;
  return kind === 'arco' ? AFK_CRIT_STREAK_STEP_ARCO : AFK_CRIT_BONUS_ESPADA;
}

export function patrolCritDamage(
  baseDamage: number,
  kind: PatrolWeaponDamageKind,
  critStreak = 0,
): number {
  if (kind === 'magia') return baseDamage;
  if (kind === 'arco') {
    return baseDamage + AFK_CRIT_STREAK_STEP_ARCO * (critStreak + 1);
  }
  return baseDamage + AFK_CRIT_BONUS_ESPADA;
}

export function formatPatrolCritChancePercent(chance: number): string {
  const value = Math.round(chance * 10) / 10;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(/\.0$/, '')}%`;
}
/** Janela de busca do próximo alvo (Lupa) entre abates, ao vivo em
    AfkCombatScene.tsx — centralizada aqui pra não desalinhar do ritmo
    offline abaixo (que precisa contar esse tempo também, senão o AFK
    rendia mais kills/min do que dá pra ver com a tela aberta). */
export const AFK_SEARCH_DURATION_MIN_MS = 5000;
export const AFK_SEARCH_DURATION_MAX_MS = 10000;

/** Segundos médios de combate por abate (golpes até matar, sem contar a
    busca do próximo alvo) — valor histórico calibrado antes da fase de
    busca existir. */
const AFK_FIGHT_SECONDS_PER_KILL = 7.5;
const AFK_SEARCH_SECONDS_AVG = (AFK_SEARCH_DURATION_MIN_MS + AFK_SEARCH_DURATION_MAX_MS) / 2 / 1000;
/** Ritmo do AFK offline — combate + busca, pra bater com o que o jogador
    veria se estivesse com a tela aberta o tempo todo. */
export const AFK_KILLS_PER_MINUTE = 60 / (AFK_FIGHT_SECONDS_PER_KILL + AFK_SEARCH_SECONDS_AVG);
export const AFK_BOSS_INTERVAL = 100;
export const AFK_ELITE_CHANCE = 12;
export const AFK_GOLDEN_SLIME_CHANCE = 5000;
export const AFK_GOLDEN_SLIME_COIN_DROP = 999;
/** @deprecated Use AFK_GOLDEN_SLIME_COIN_DROP. */
export const AFK_GOLDEN_SLIME_MOEDA_BONUS = AFK_GOLDEN_SLIME_COIN_DROP;
export const AFK_HERO_BASE_HP = 250;
export const AFK_HERO_DEFEAT_SECONDS = 10;
export const AFK_COMMON_ATTACK_SECONDS = 10;
export const AFK_ELITE_ATTACK_SECONDS = 4;
export const AFK_BOSS_ATTACK_SECONDS = 20;
/** @deprecated Loot raro migrou pra janelas /1e6 por tier em afk-rolls (server). */
export const AFK_LEGENDARY_ROLL_NORMAL = 9995;
/** @deprecated Loot raro migrou pra janelas /1e6 por tier em afk-rolls (server). */
export const AFK_LEGENDARY_ROLL_BOSS = 9991;
/** @deprecated Armas nível 9 viraram Míticas — ver rollBossMythicWeapon em afk-rolls. */
export const AFK_BOSS_LEGENDARY_WEAPON_ROLL = 9987;

// HP do capítulo 1. Inimigos não-chefes recebem +1.000 HP por capítulo.
// Chefes usam valores próprios, começando em 30 mil e escalando até 100 mil.
export const AFK_ENEMIES: Record<AfkEnemyId, AfkEnemyDefinition> = {
  bat: { id: 'bat', tier: 'common', maxHp: 45, label: 'Slime Morcego' },
  zombie: { id: 'zombie', tier: 'common', maxHp: 60, label: 'Slime Musgo' },
  skeleton: { id: 'skeleton', tier: 'common', maxHp: 80, label: 'Slime Esqueleto' },
  slime_macaco: { id: 'slime_macaco', tier: 'common', maxHp: 55, label: 'Slime Macaco' },
  slime_agua: { id: 'slime_agua', tier: 'common', maxHp: 70, label: 'Slime de Água' },
  slime_doce: { id: 'slime_doce', tier: 'common', maxHp: 50, label: 'Slime de Doce' },
  slime_chocolate: {
    id: 'slime_chocolate',
    tier: 'common',
    maxHp: 75,
    label: 'Slime de Chocolate',
  },
  sand_slime: { id: 'sand_slime', tier: 'common', maxHp: 90, label: 'Slime de Areia' },
  lich_slime: { id: 'lich_slime', tier: 'common', maxHp: 95, label: 'Slime Lich Menor' },
  stone_slime: { id: 'stone_slime', tier: 'common', maxHp: 110, label: 'Slime de Pedra' },
  clock_slime: { id: 'clock_slime', tier: 'common', maxHp: 105, label: 'Slime Relógio' },
  sleepy_slime: { id: 'sleepy_slime', tier: 'common', maxHp: 115, label: 'Slime Sonolento' },
  dream_slime: { id: 'dream_slime', tier: 'common', maxHp: 125, label: 'Slime dos Sonhos' },
  armored_skeleton: { id: 'armored_skeleton', tier: 'elite', maxHp: 450, label: 'Slime Blindado' },
  crystal_slime: { id: 'crystal_slime', tier: 'elite', maxHp: 520, label: 'Slime Cristalino' },
  storm_slime: { id: 'storm_slime', tier: 'elite', maxHp: 580, label: 'Slime Trovão' },
  slime_knight: { id: 'slime_knight', tier: 'elite', maxHp: 620, label: 'Slime Cavaleiro' },
  slime_chumbo: { id: 'slime_chumbo', tier: 'elite', maxHp: 700, label: 'Slime Chumbo' },
  dune_brute: { id: 'dune_brute', tier: 'elite', maxHp: 540, label: 'Brutamonte das Dunas' },
  necro_slime: { id: 'necro_slime', tier: 'elite', maxHp: 600, label: 'Slime Necromante' },
  stone_guardian: { id: 'stone_guardian', tier: 'elite', maxHp: 680, label: 'Guardião de Pedra' },
  chronos_slime: { id: 'chronos_slime', tier: 'elite', maxHp: 720, label: 'Slime Cronos' },
  nightmare_slime: { id: 'nightmare_slime', tier: 'elite', maxHp: 760, label: 'Slime Pesadelo' },
  golden_slime: { id: 'golden_slime', tier: 'common', maxHp: 1500, label: 'Golden Slime' },
  magic_rabbit: { id: 'magic_rabbit', tier: 'common', maxHp: 1200, label: 'Slime Mágico' },
  slime_enigma: { id: 'slime_enigma', tier: 'common', maxHp: 1800, label: '?' },
  slime_binario: { id: 'slime_binario', tier: 'common', maxHp: 1800, label: 'Slime Binário' },
  boss_colossus: { id: 'boss_colossus', tier: 'boss', maxHp: 30000, label: 'Rei Slime' },
  boss_crocodile: { id: 'boss_crocodile', tier: 'boss', maxHp: 40000, label: 'Slime Crocodilo' },
  boss_lich: { id: 'boss_lich', tier: 'boss', maxHp: 52000, label: 'Slime Lich' },
  boss_hydra: { id: 'boss_hydra', tier: 'boss', maxHp: 8000, label: 'Hidra Slime' },
  boss_golem: { id: 'boss_golem', tier: 'boss', maxHp: 66000, label: 'Golem de Pedra' },
  boss_procrastinador: {
    id: 'boss_procrastinador',
    tier: 'boss',
    maxHp: 82000,
    label: 'Slime Procrastinador',
  },
  boss_preguica: { id: 'boss_preguica', tier: 'boss', maxHp: 100000, label: 'Slime Preguiçoso' },
};

export const AFK_MAGIC_RABBIT_CHANCE = 2304;
/** "?" — 1 em 100.000 spawns. */
export const AFK_ENIGMA_CHANCE = 100_000;
/** Slime Binário — 1 em 101.010 spawns. */
export const AFK_BINARIO_CHANCE = 101_010;

const COMMON_ENEMIES: AfkEnemyId[] = [
  'bat',
  'zombie',
  'skeleton',
  'slime_macaco',
  'slime_agua',
  'slime_doce',
  'slime_chocolate',
];
const ELITE_ENEMIES: AfkEnemyId[] = [
  'armored_skeleton',
  'crystal_slime',
  'storm_slime',
  'slime_knight',
  'slime_chumbo',
];
const BOSS_ENEMIES: AfkEnemyId[] = [
  'boss_colossus',
  'boss_lich',
  'boss_hydra',
  'boss_golem',
  'boss_procrastinador',
  'boss_preguica',
];

export const DEFAULT_AFK_COMBAT: AfkCombatState = {
  kills_total: 0,
  kills_until_boss: 0,
  enemy_id: 'bat',
  enemy_hp: AFK_ENEMIES.bat.maxHp,
  is_boss: false,
  elite: false,
  region_id: 'verdant-trail',
  region_progress: {},
  unlocked_regions: ['verdant-trail'],
  hero_hp: AFK_HERO_BASE_HP,
  hero_defeated_until: null,
  combat_last_at: null,
  orbs: 0,
  skill_nodes: [],
  skill_tree_free_reset_used: false,
  adventure_started: false,
  intro_seen: false,
  slime_language_unlocked: false,
  story_flags: [],
};

export function hashCombatSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getEnemyMaxHp(enemyId: AfkEnemyId, chapter = 1): number {
  const definition = AFK_ENEMIES[enemyId] ?? AFK_ENEMIES.bat;
  if (definition.tier === 'boss') return definition.maxHp;
  return definition.maxHp + Math.max(0, Math.floor(chapter) - 1) * 1000;
}

export function getEnemyAttackIntervalSeconds(tier: AfkEnemyTier): number {
  if (tier === 'boss') return AFK_BOSS_ATTACK_SECONDS;
  if (tier === 'elite') return AFK_ELITE_ATTACK_SECONDS;
  return AFK_COMMON_ATTACK_SECONDS;
}

export function getEnemyAttackDamage(
  enemyId: AfkEnemyId,
  _chapter = 1,
  heroMaxHp = AFK_HERO_BASE_HP,
  tierOverride?: AfkEnemyTier,
): number {
  // O encontro é a autoridade para o tier. Saves antigos podiam conter o ID
  // de um chefe junto de `is_boss: false`; usar apenas o catálogo transformava
  // esse encontro comum em hitkill.
  const tier = tierOverride ?? AFK_ENEMIES[enemyId]?.tier ?? 'common';
  if (tier === 'boss') return Number.POSITIVE_INFINITY;
  // O dano acompanha a vida máxima do herói: melhorias de vitalidade não
  // quebram o balanceamento de 10 golpes comuns / 8 golpes de elite.
  if (tier === 'elite') return Math.ceil(Math.max(1, heroMaxHp) / 8);
  return Math.ceil(Math.max(1, heroMaxHp) / 10);
}

export interface AfkSpawnResult {
  enemy_id: AfkEnemyId;
  elite: boolean;
  is_boss: boolean;
}

function pickFromPool(pool: AfkEnemyId[], seed: number, previousEnemyId?: AfkEnemyId): AfkEnemyId {
  let idx = (seed >>> 8) % pool.length;
  if (pool.length > 1 && previousEnemyId && pool[idx] === previousEnemyId) {
    idx = (idx + 1 + ((seed >>> 16) % (pool.length - 1))) % pool.length;
  }
  return pool[idx] ?? pool[0]!;
}

export function shouldSpawnGoldenSlime(seed: number): boolean {
  return seed % AFK_GOLDEN_SLIME_CHANCE === 0;
}

export function shouldSpawnMagicRabbit(seed: number): boolean {
  return seed % AFK_MAGIC_RABBIT_CHANCE === 0;
}

export function shouldSpawnEnigma(seed: number): boolean {
  return seed % AFK_ENIGMA_CHANCE === 0;
}

export function shouldSpawnBinario(seed: number): boolean {
  return seed % AFK_BINARIO_CHANCE === 0;
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
  regionId: AfkRegionId = 'verdant-trail',
): AfkSpawnResult {
  const region = getAfkRegionById(regionId);
  const isBoss = shouldSpawnBoss(killsUntilBoss, region.killsToBoss);
  const seed = hashCombatSeed(`${userId}:${killsTotal}:spawn`);

  if (isBoss) {
    return { enemy_id: region.bossId, elite: false, is_boss: true };
  }

  if (!isBoss && shouldSpawnGoldenSlime(seed)) {
    return { enemy_id: 'golden_slime', elite: false, is_boss: false };
  }

  if (!isBoss && shouldSpawnMagicRabbit(seed)) {
    return { enemy_id: 'magic_rabbit', elite: false, is_boss: false };
  }

  if (!isBoss && shouldSpawnEnigma(seed)) {
    return { enemy_id: 'slime_enigma', elite: false, is_boss: false };
  }

  if (!isBoss && shouldSpawnBinario(seed)) {
    return { enemy_id: 'slime_binario', elite: false, is_boss: false };
  }

  const elite = shouldSpawnElite(seed);
  const pool = elite ? region.eliteEnemies : region.commonEnemies;
  return {
    enemy_id: pickFromPool([...pool], seed, previousEnemyId),
    elite,
    is_boss: false,
  };
}

/** Boss aparece a cada AFK_BOSS_INTERVAL (100) mortes — o gatilho é bater
    exatamente esse número, não "99" (o -1 antigo fazia o boss chegar um
    kill antes do contador "X/100" realmente zerar). */
export function shouldSpawnBoss(killsUntilBoss: number, target = AFK_BOSS_INTERVAL): boolean {
  return killsUntilBoss >= target;
}

/** Espelha o incremento de kills_until_boss ao derrotar um inimigo (servidor + UI). */
export function advanceKillsUntilBoss(
  killsUntilBoss: number,
  wasBoss: boolean,
  target = AFK_BOSS_INTERVAL,
): number {
  if (wasBoss) return 0;
  const next = killsUntilBoss + 1;
  if (next >= target) return target;
  return next;
}

export function shouldSpawnElite(seed: number): boolean {
  return seed % 100 < AFK_ELITE_CHANCE;
}

export function buildCombatSnapshot(state: AfkCombatState): AfkCombatSnapshot {
  const region = getAfkRegionById(state.region_id);
  const enemy_max_hp = getEnemyMaxHp(state.enemy_id, region.chapter);
  return {
    kills_total: state.kills_total,
    kills_until_boss: state.kills_until_boss,
    kills_to_next_boss: Math.max(0, region.killsToBoss - state.kills_until_boss),
    enemy_id: state.enemy_id,
    enemy_hp: Math.min(state.enemy_hp, enemy_max_hp),
    enemy_max_hp,
    is_boss: state.is_boss,
    elite: state.elite,
    hero_damage_arco: AFK_HERO_DAMAGE_ARCO,
    hero_damage_espada: AFK_HERO_DAMAGE_ESPADA,
    region_id: region.id,
    region_progress: state.region_progress ?? {},
    unlocked_regions: state.unlocked_regions ?? ['verdant-trail'],
    hero_hp: Math.max(0, state.hero_hp ?? AFK_HERO_BASE_HP),
    hero_max_hp: AFK_HERO_BASE_HP,
    hero_defeated_until: state.hero_defeated_until ?? null,
    search_remaining_ms: Math.max(0, state.search_remaining_ms ?? 0),
    hero_attack_remaining_ms: Math.max(0, state.hero_attack_remaining_ms ?? 0),
    enemy_attack_remaining_ms: Math.max(0, state.enemy_attack_remaining_ms ?? 0),
    defeated_remaining_ms: Math.max(0, state.defeated_remaining_ms ?? 0),
    orbs: Math.max(0, state.orbs ?? 0),
    skill_nodes: state.skill_nodes ?? [],
    skill_tree_free_reset_used: Boolean(state.skill_tree_free_reset_used),
    adventure_started: Boolean(state.adventure_started),
    intro_seen: Boolean(state.intro_seen),
    slime_language_unlocked: Boolean(state.slime_language_unlocked),
    story_flags: state.story_flags ?? [],
  };
}
