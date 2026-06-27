import type { UserDocument } from '../domain/User.js';
import {
  ALL_BESTIARY_ENEMY_IDS,
  BESTIARY_CATEGORIES,
  AFK_ENEMIES,
  XP_DAILY_CAP_PER_BESTIARY,
  isBestiaryEnemyId,
  type AfkEnemyId,
} from '../types/index.js';

export function ensureBestiario(user: UserDocument): AfkEnemyId[] {
  if (!Array.isArray(user.gamificacao.bestiario_desbloqueados)) {
    user.gamificacao.bestiario_desbloqueados = [];
  }
  user.gamificacao.bestiario_desbloqueados = user.gamificacao.bestiario_desbloqueados.filter(
    (id): id is AfkEnemyId => isBestiaryEnemyId(String(id)),
  );
  return user.gamificacao.bestiario_desbloqueados;
}

export function countBestiaryUnlocks(user: UserDocument): number {
  return ensureBestiario(user).length;
}

export function bestiaryDailyCapBonus(user: UserDocument): number {
  return countBestiaryUnlocks(user) * XP_DAILY_CAP_PER_BESTIARY;
}

/** Registra primeira vitória contra um inimigo. Retorna true se foi desbloqueio novo. */
export function unlockBestiaryEnemy(user: UserDocument, enemyId: AfkEnemyId): boolean {
  if (!isBestiaryEnemyId(enemyId)) return false;
  const unlocked = ensureBestiario(user);
  if (unlocked.includes(enemyId)) return false;
  unlocked.push(enemyId);
  return true;
}

export interface BestiaryEntryResponse {
  id: AfkEnemyId;
  label: string;
  tier: 'common' | 'elite' | 'boss';
  max_hp: number;
  desbloqueado: boolean;
}

export interface BestiaryCategoryResponse {
  id: 'common' | 'elite' | 'boss';
  label: string;
  entries: BestiaryEntryResponse[];
}

export function readBestiaryResponse(user: UserDocument): {
  categorias: BestiaryCategoryResponse[];
  desbloqueados: AfkEnemyId[];
  bonus_cap_diario: number;
  total_inimigos: number;
} {
  const unlocked = new Set(ensureBestiario(user));
  const categorias: BestiaryCategoryResponse[] = BESTIARY_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    entries: category.enemyIds.map((id) => {
      const def = AFK_ENEMIES[id];
      return {
        id,
        label: def.label,
        tier: def.tier,
        max_hp: def.maxHp,
        desbloqueado: unlocked.has(id),
      };
    }),
  }));

  return {
    categorias,
    desbloqueados: [...unlocked],
    bonus_cap_diario: unlocked.size * XP_DAILY_CAP_PER_BESTIARY,
    total_inimigos: ALL_BESTIARY_ENEMY_IDS.length,
  };
}
