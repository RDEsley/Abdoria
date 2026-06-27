import {
  AFK_CRIT_BONUS_ESPADA,
  AFK_CRIT_CHANCE_ARCO,
  AFK_CRIT_CHANCE_ESPADA,
  AFK_CRIT_STREAK_STEP_ARCO,
  AFK_ENEMIES,
  type AfkEnemyId,
  type PatrolWeaponDamageKind,
} from '../afk/combat.js';
import {
  PATROL_WEAPON_BY_ID,
  patrolHeroDamage,
  type PatrolWeaponDefinition,
} from './shop.js';

export const AFK_LEVEL10_BOW_DAMAGE_SPECIAL = 52;
export const AFK_LEVEL10_SWORD_DAMAGE_SPECIAL = 60;
export const AFK_LEVEL10_BOW_CRIT_CHANCE = 28;
export const AFK_LEVEL10_SWORD_CRIT_CHANCE = 18;

/** Slimes comuns (sem Golden Slime) — alvo de Hit Kill no nível 10. */
export function isPatrolHitKillTarget(enemyId: AfkEnemyId): boolean {
  const def = AFK_ENEMIES[enemyId];
  return def.tier === 'common' && enemyId !== 'golden_slime';
}

/** Elite, boss ou Golden Slime — exceção de dano no nível 10. */
export function isPatrolSpecialTarget(enemyId: AfkEnemyId): boolean {
  const def = AFK_ENEMIES[enemyId];
  return def.tier === 'elite' || def.tier === 'boss' || enemyId === 'golden_slime';
}

export function isPatrolLevel10Weapon(weaponId: string): boolean {
  return PATROL_WEAPON_BY_ID[weaponId]?.nivel === 10;
}

export function resolvePatrolCritChancePercent(
  kind: PatrolWeaponDamageKind,
  weaponId: string,
  enemyId: AfkEnemyId,
): number {
  const def = PATROL_WEAPON_BY_ID[weaponId];

  if (def?.nivel === 10 && isPatrolSpecialTarget(enemyId)) {
    return kind === 'arco' ? AFK_LEVEL10_BOW_CRIT_CHANCE : AFK_LEVEL10_SWORD_CRIT_CHANCE;
  }

  if (def?.nivel === 10 && isPatrolHitKillTarget(enemyId)) {
    return 0;
  }

  return kind === 'arco' ? AFK_CRIT_CHANCE_ARCO : AFK_CRIT_CHANCE_ESPADA;
}

export function resolvePatrolBaseDamage(
  kind: PatrolWeaponDamageKind,
  weaponId: string,
  enemyId: AfkEnemyId,
): number {
  const def = PATROL_WEAPON_BY_ID[weaponId];
  const base = patrolHeroDamage(kind, weaponId);

  if (def?.nivel === 10 && isPatrolHitKillTarget(enemyId)) {
    return AFK_ENEMIES[enemyId].maxHp;
  }

  if (def?.nivel === 10 && isPatrolSpecialTarget(enemyId)) {
    return kind === 'arco' ? AFK_LEVEL10_BOW_DAMAGE_SPECIAL : AFK_LEVEL10_SWORD_DAMAGE_SPECIAL;
  }

  return base;
}

export interface PatrolAttackResult {
  damage: number;
  isCrit: boolean;
  isHitKill: boolean;
  nextCritStreak: number;
}

export function resolvePatrolAttackDamage(opts: {
  kind: PatrolWeaponDamageKind;
  weaponId: string;
  enemyId: AfkEnemyId;
  critStreak: number;
  isCrit: boolean;
}): PatrolAttackResult {
  const { kind, weaponId, enemyId, critStreak, isCrit } = opts;
  const enemyMaxHp = AFK_ENEMIES[enemyId].maxHp;

  if (isPatrolLevel10Weapon(weaponId) && isPatrolHitKillTarget(enemyId)) {
    return {
      damage: enemyMaxHp,
      isCrit: false,
      isHitKill: true,
      nextCritStreak: 0,
    };
  }

  let damage = resolvePatrolBaseDamage(kind, weaponId, enemyId);
  let nextCritStreak = 0;

  if (isCrit) {
    if (kind === 'arco') {
      damage += AFK_CRIT_STREAK_STEP_ARCO * (critStreak + 1);
      nextCritStreak = critStreak + 1;
    } else {
      damage += AFK_CRIT_BONUS_ESPADA;
    }
  } else if (kind === 'arco') {
    nextCritStreak = 0;
  }

  return {
    damage,
    isCrit,
    isHitKill: false,
    nextCritStreak,
  };
}

export function patrolWeaponLabel(def: PatrolWeaponDefinition | undefined): string {
  return def?.nome ?? 'Arma';
}
