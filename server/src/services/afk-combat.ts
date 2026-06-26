import type { UserDocument } from '../domain/User.js';
import {
  AFK_BOSS_INTERVAL,
  AFK_KILLS_PER_MINUTE,
  DEFAULT_AFK_COMBAT,
  type AfkCombatState,
  type AfkPendingReward,
  advanceKillsUntilBoss,
  buildCombatSnapshot,
  getEnemyMaxHp,
  hashCombatSeed,
  pickNextEnemy,
  shouldSpawnBoss,
  shouldSpawnElite,
} from '../types/index.js';
import { normalizeCombat } from '../repositories/user-repository.js';
import { rollKillDrop } from './afk-rolls.js';

export function ensureCombat(user: UserDocument): AfkCombatState {
  if (!user.afk) {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false },
      combat: { ...DEFAULT_AFK_COMBAT },
    };
  }
  if (!user.afk.combat) {
    user.afk.combat = { ...DEFAULT_AFK_COMBAT };
  }
  user.afk.combat = normalizeCombat(user.afk.combat);
  return user.afk.combat;
}

function respawnEnemy(user: UserDocument, combat: AfkCombatState): void {
  const isBoss = shouldSpawnBoss(combat.kills_until_boss);
  const seed = hashCombatSeed(`${user.id}:${combat.kills_total}:spawn`);
  const elite = !isBoss && shouldSpawnElite(seed);
  const picked = pickNextEnemy(seed, { isBoss, isElite: elite });

  combat.enemy_id = picked.enemy_id;
  combat.enemy_hp = getEnemyMaxHp(picked.enemy_id);
  combat.is_boss = picked.is_boss;
  combat.elite = picked.elite;
}

function onEnemyDefeated(user: UserDocument, combat: AfkCombatState, pending: AfkPendingReward): void {
  const wasBoss = combat.is_boss;

  combat.kills_total += 1;
  combat.kills_until_boss = advanceKillsUntilBoss(combat.kills_until_boss, wasBoss);

  rollKillDrop(user, combat.kills_total, pending, wasBoss ? { bossBoost: true } : undefined);

  respawnEnemy(user, combat);
}

/** Aplica dano até matar o inimigo atual (um kill). */
export function applyKill(user: UserDocument): void {
  const combat = ensureCombat(user);
  const afk = user.afk!;
  afk.pending = afk.pending ?? { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false };

  combat.enemy_hp = 0;
  onEnemyDefeated(user, combat, afk.pending);
}

/** Simula kills offline proporcionais aos minutos patrulhados. */
export function simulateOfflineKills(user: UserDocument, newMinutes: number): number {
  if (newMinutes <= 0) return 0;

  const killsToSimulate = Math.floor(newMinutes * AFK_KILLS_PER_MINUTE);
  if (killsToSimulate <= 0) return 0;

  const combat = ensureCombat(user);
  const afk = user.afk!;
  afk.pending = afk.pending ?? { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false };

  const avgDamage = 16;
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
  return buildCombatSnapshot(combat);
}
