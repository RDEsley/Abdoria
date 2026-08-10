import { AFK_ENEMIES, type AfkEnemyId, type AfkEnemyTier } from './combat.js';

export type BestiaryCategoryId = AfkEnemyTier | 'golden';

export interface BestiaryCategory {
  id: BestiaryCategoryId;
  label: string;
  enemyIds: AfkEnemyId[];
}

export const BESTIARY_CATEGORIES: BestiaryCategory[] = [
  {
    id: 'common',
    label: 'Comuns',
    enemyIds: [
      'bat',
      'zombie',
      'skeleton',
      'slime_macaco',
      'slime_agua',
      'slime_doce',
      'slime_chocolate',
      'sand_slime',
      'lich_slime',
      'stone_slime',
      'clock_slime',
      'sleepy_slime',
      'dream_slime',
    ],
  },
  {
    id: 'elite',
    label: 'Elites',
    enemyIds: [
      'armored_skeleton',
      'crystal_slime',
      'storm_slime',
      'slime_knight',
      'slime_chumbo',
      'dune_brute',
      'necro_slime',
      'stone_guardian',
      'chronos_slime',
      'nightmare_slime',
    ],
  },
  {
    id: 'boss',
    label: 'Chefes',
    enemyIds: [
      'boss_colossus',
      'boss_crocodile',
      'boss_lich',
      'boss_golem',
      'boss_procrastinador',
      'boss_preguica',
    ],
  },
  {
    id: 'golden',
    label: 'Especial',
    enemyIds: ['golden_slime', 'magic_rabbit', 'slime_enigma', 'slime_binario'],
  },
];

export const ALL_BESTIARY_ENEMY_IDS: AfkEnemyId[] = BESTIARY_CATEGORIES.flatMap((c) => c.enemyIds);

export function isBestiaryEnemyId(id: string): id is AfkEnemyId {
  return id in AFK_ENEMIES && ALL_BESTIARY_ENEMY_IDS.includes(id as AfkEnemyId);
}

export function bestiaryEnemyLabel(id: AfkEnemyId): string {
  return AFK_ENEMIES[id]?.label ?? id;
}

export function bestiaryEnemyTier(id: AfkEnemyId): AfkEnemyTier {
  return AFK_ENEMIES[id]?.tier ?? 'common';
}
