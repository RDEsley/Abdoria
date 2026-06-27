import type { UserDocument } from '../domain/User.js';
import {
  AFK_KILLS_PER_MINUTE,
  AFK_GOLDEN_SLIME_ABDORIA,
  DEFAULT_AFK_COMBAT,
  type AfkCombatState,
  type AfkEnemyTier,
  type AfkPendingReward,
  advanceKillsUntilBoss,
  buildCombatSnapshot,
  getEnemyMaxHp,
  patrolHeroDamage,
  resolveNextSpawn,
  resolvePatrolArmas,
} from '../types/index.js';
import { normalizeCombat } from '../repositories/user-repository.js';
import { rollKillDrop, rollRouteDrinkDrop, rollBossLegendaryWeapon, rollGoldenSlimeSecretCosmetic } from './afk-rolls.js';
import { unlockBestiaryEnemy, recordBestiaryKillDrops } from './bestiario.js';
import { snapshotBestiaryPending } from '../types/index.js';

export function ensureCombat(user: UserDocument): AfkCombatState {
  if (!user.afk) {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { xp: 0, abdoria: 0, frozen_streaks: 0, route_drinks: 0, cosmetic_ids: [], weapon_ids: [], exp_instant: 0, doria_bags: 0, titulo_secreto: false, drop_count: 0 },
      combat: { ...DEFAULT_AFK_COMBAT },
    };
  }
  if (!user.afk.combat) {
    user.afk.combat = { ...DEFAULT_AFK_COMBAT };
  }
  user.afk.combat = normalizeCombat(user.afk.combat);
  return user.afk.combat;
}

function enemyTier(combat: AfkCombatState): AfkEnemyTier {
  if (combat.is_boss) return 'boss';
  if (combat.elite) return 'elite';
  return 'common';
}

function respawnEnemy(user: UserDocument, combat: AfkCombatState): void {
  const previousEnemyId = combat.enemy_id;
  const picked = resolveNextSpawn(
    String(user.id),
    combat.kills_until_boss,
    combat.kills_total,
    previousEnemyId,
  );

  combat.enemy_id = picked.enemy_id;
  combat.enemy_hp = getEnemyMaxHp(picked.enemy_id);
  combat.is_boss = picked.is_boss;
  combat.elite = picked.elite;
}

function onEnemyDefeated(user: UserDocument, combat: AfkCombatState, pending: AfkPendingReward): void {
  const defeatedEnemyId = combat.enemy_id;
  const wasBoss = combat.is_boss;
  const wasGolden = defeatedEnemyId === 'golden_slime';
  const tier = enemyTier(combat);

  unlockBestiaryEnemy(user, defeatedEnemyId);

  const pendingBefore = snapshotBestiaryPending(pending);

  combat.kills_total += 1;
  combat.kills_until_boss = advanceKillsUntilBoss(combat.kills_until_boss, wasBoss);

  if (wasGolden) {
    pending.abdoria += AFK_GOLDEN_SLIME_ABDORIA;
    pending.drop_count = (pending.drop_count ?? 0) + 1;
    rollGoldenSlimeSecretCosmetic(user, combat.kills_total, pending);
  } else {
    rollKillDrop(user, combat.kills_total, pending, { bossBoost: wasBoss, tier });
    if (wasBoss) {
      const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
      rollBossLegendaryWeapon(user, combat.kills_total, pending, new Set(armas.desbloqueados));
    }
  }

  rollRouteDrinkDrop(user, combat.kills_total, pending);

  recordBestiaryKillDrops(user, defeatedEnemyId, pendingBefore, snapshotBestiaryPending(pending));

  respawnEnemy(user, combat);
}

/** Derrota o inimigo atual e aplica drops (golden slime, boss, etc.). */
export function defeatCurrentEnemy(user: UserDocument, pending: AfkPendingReward): void {
  const combat = ensureCombat(user);
  combat.enemy_hp = 0;
  onEnemyDefeated(user, combat, pending);
}

/** Aplica dano até matar o inimigo atual (um kill). */
export function applyKill(user: UserDocument): void {
  const combat = ensureCombat(user);
  const afk = user.afk!;
  afk.pending = afk.pending ?? { xp: 0, abdoria: 0, frozen_streaks: 0, route_drinks: 0, cosmetic_ids: [], weapon_ids: [], titulo_secreto: false, drop_count: 0 };

  combat.enemy_hp = 0;
  onEnemyDefeated(user, combat, afk.pending);
}

/** Simula kills offline proporcionais aos minutos em exploração. */
export function simulateOfflineKills(user: UserDocument, newMinutes: number): number {
  if (newMinutes <= 0) return 0;

  const killsToSimulate = Math.floor(newMinutes * AFK_KILLS_PER_MINUTE);
  if (killsToSimulate <= 0) return 0;

  const combat = ensureCombat(user);
  const afk = user.afk!;
  afk.pending = afk.pending ?? { xp: 0, abdoria: 0, frozen_streaks: 0, route_drinks: 0, cosmetic_ids: [], weapon_ids: [], titulo_secreto: false, drop_count: 0 };

  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const avgDamage = Math.round(
    (patrolHeroDamage('arco', armas.arco_equipado) + patrolHeroDamage('espada', armas.espada_equipada)) / 2,
  );
  let applied = 0;

  for (let i = 0; i < killsToSimulate; i += 1) {
    let damageLeft = getEnemyMaxHp(combat.enemy_id);

    while (damageLeft > 0) {
      damageLeft -= avgDamage;
      if (damageLeft <= 0) {
        combat.enemy_hp = 0;
        onEnemyDefeated(user, combat, afk.pending);
        applied += 1;
        break;
      }
      combat.enemy_hp = damageLeft;
    }
  }

  return applied;
}

export function combatSnapshot(user: UserDocument) {
  const combat = ensureCombat(user);
  const snap = buildCombatSnapshot(combat);
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);

  return {
    ...snap,
    hero_damage_arco: patrolHeroDamage('arco', armas.arco_equipado),
    hero_damage_espada: patrolHeroDamage('espada', armas.espada_equipada),
  };
}
