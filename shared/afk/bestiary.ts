import { AFK_ENEMIES, type AfkEnemyId, type AfkEnemyTier } from './combat.js';

export type BestiaryCategoryId = AfkEnemyTier;

export interface BestiaryCategory {
  id: BestiaryCategoryId;
  label: string;
  enemyIds: AfkEnemyId[];
}

export const BESTIARY_CATEGORIES: BestiaryCategory[] = [
  {
    id: 'common',
    label: 'Comuns',
    enemyIds: ['bat', 'zombie', 'skeleton', 'golden_slime'],
  },
  {
    id: 'elite',
    label: 'Elites',
    enemyIds: ['armored_skeleton', 'demon_bat', 'slime_knight'],
  },
  {
    id: 'boss',
    label: 'Chefes',
    enemyIds: ['boss_colossus', 'boss_lich', 'boss_hydra'],
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
