import type { UserRecord } from '../domain/User.js';
import {
  AFK_GOLDEN_SLIME_COIN_DROP,
  AFK_SEARCH_DURATION_MAX_MS,
  AFK_SEARCH_DURATION_MIN_MS,
  DEFAULT_AFK_COMBAT,
  afkDefeatDurationMs,
  afkHeroMaxHp,
  afkSearchReductionMs,
  advanceKillsUntilBoss,
  buildCombatSnapshot,
  getAfkRegionById,
  getAfkSkillTotal,
  getEnemyAttackDamage,
  getEnemyAttackIntervalSeconds,
  getEnemyMaxHp,
  hashCombatSeed,
  patrolHeroDamage,
  resolveNextSpawn,
  resolvePatrolAttackDamage,
  resolvePatrolCritChancePercent,
  resolvePatrolArmas,
  type AfkCombatState,
  type AfkEnemyTier,
  type AfkPendingReward,
  type AfkRegionCombatProgress,
  type PatrolWeaponDamageKind,
} from '../types/index.js';
import { normalizeCombat, normalizePending } from '../repositories/user-repository.js';
import {
  rollBinarioDrop,
  rollBossSignatureWeapon,
  rollEnigmaDrop,
  rollKillDrop,
  rollMagicRabbitSpell,
  rollRouteDrinkDrop,
  rollSlimeMaterialDrop,
} from './afk-rolls.js';
import { unlockBestiaryEnemy, recordBestiaryKillDrops } from './bestiario.js';
import { snapshotBestiaryPending } from '../types/index.js';

const EMPTY_PENDING: AfkPendingReward = {
  xp: 0,
  abdoria: 0,
  frozen_streaks: 0,
  route_drinks: 0,
  cosmetic_ids: [],
  weapon_ids: [],
  exp_instant: 0,
  doria_bags: 0,
  material_items: {},
  titulo_secreto: false,
  drop_count: 0,
};

export function ensureCombat(user: UserRecord): AfkCombatState {
  if (!user.afk) {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { ...EMPTY_PENDING },
      combat: { ...DEFAULT_AFK_COMBAT },
    };
  }
  user.afk.pending = normalizePending(user.afk.pending ?? EMPTY_PENDING);
  user.afk.combat = normalizeCombat(user.afk.combat ?? DEFAULT_AFK_COMBAT);
  return user.afk.combat;
}

function enemyTier(combat: AfkCombatState): AfkEnemyTier {
  if (combat.is_boss) return 'boss';
  if (combat.elite) return 'elite';
  return 'common';
}

function currentRegionProgress(combat: AfkCombatState): AfkRegionCombatProgress {
  const region = getAfkRegionById(combat.region_id);
  combat.region_progress ??= {};
  combat.region_progress[region.id] ??= {
    kills_until_boss: combat.kills_until_boss,
    boss_defeated: false,
    boss_kills: 0,
    orbs_earned: 0,
  };
  return combat.region_progress[region.id]!;
}

function respawnEnemy(user: UserRecord, combat: AfkCombatState): void {
  const region = getAfkRegionById(combat.region_id);
  const progress = currentRegionProgress(combat);
  const previousEnemyId = combat.enemy_id;
  const picked = resolveNextSpawn(
    String(user.id),
    progress.kills_until_boss,
    combat.kills_total,
    previousEnemyId,
    region.id,
  );

  combat.kills_until_boss = progress.kills_until_boss;
  combat.enemy_id = picked.enemy_id;
  combat.enemy_hp = getEnemyMaxHp(picked.enemy_id, region.chapter);
  combat.is_boss = picked.is_boss;
  combat.elite = picked.elite;
  combat.hero_attack_remaining_ms = 250;
  combat.enemy_attack_remaining_ms = getEnemyAttackIntervalSeconds(enemyTier(combat)) * 1000;
}

function grantBossOrb(combat: AfkCombatState, progress: AfkRegionCombatProgress): void {
  const region = getAfkRegionById(combat.region_id);
  const canEarn = region.chapter === 6 || progress.orbs_earned < 10;
  if (!canEarn) return;
  progress.orbs_earned += 1;
  combat.orbs = Math.max(0, combat.orbs ?? 0) + 1;
}

function onEnemyDefeated(
  user: UserRecord,
  combat: AfkCombatState,
  pending: AfkPendingReward,
): void {
  const region = getAfkRegionById(combat.region_id);
  const progress = currentRegionProgress(combat);
  const defeatedEnemyId = combat.enemy_id;
  const wasBoss = combat.is_boss;
  const wasGolden = defeatedEnemyId === 'golden_slime';
  const wasMagic = defeatedEnemyId === 'magic_rabbit';
  const wasEnigma = defeatedEnemyId === 'slime_enigma';
  const wasBinario = defeatedEnemyId === 'slime_binario';
  const tier = enemyTier(combat);

  unlockBestiaryEnemy(user, defeatedEnemyId);
  const pendingBefore = snapshotBestiaryPending(pending);

  combat.kills_total += 1;
  progress.kills_until_boss = advanceKillsUntilBoss(
    progress.kills_until_boss,
    wasBoss,
    region.killsToBoss,
  );
  combat.kills_until_boss = progress.kills_until_boss;

  // Material da espécie é uma rolagem própria e pode acompanhar qualquer
  // outro resultado desta vitória, inclusive arma e drops secretos.
  rollSlimeMaterialDrop(user, defeatedEnemyId, combat.kills_total, pending);

  if (wasBoss) {
    progress.boss_defeated = true;
    progress.boss_kills += 1;
    grantBossOrb(combat, progress);
    if (region.chapter === 6) combat.slime_language_unlocked = true;
  }

  if (wasGolden) {
    // Golden Slime tem uma identidade simples e inequívoca: somente 999 Coins.
    pending.abdoria += AFK_GOLDEN_SLIME_COIN_DROP;
    pending.drop_count = (pending.drop_count ?? 0) + 1;
  } else if (wasMagic) {
    rollMagicRabbitSpell(
      user,
      combat.kills_total,
      pending,
      getAfkSkillTotal(combat.skill_nodes, 'spell_drop_pct'),
    );
  } else if (wasEnigma) {
    rollEnigmaDrop(user, combat.kills_total, pending);
  } else if (wasBinario) {
    rollBinarioDrop(user, combat.kills_total, pending);
  } else {
    rollKillDrop(user, combat.kills_total, pending, {
      bossBoost: wasBoss,
      tier,
      chapter: region.chapter,
      bossId: wasBoss ? defeatedEnemyId : undefined,
      skillDropBonusPct: getAfkSkillTotal(combat.skill_nodes, 'drop_chance_pct'),
    });
    if (wasBoss) {
      rollBossSignatureWeapon(user, defeatedEnemyId, combat.kills_total, pending, region.chapter);
    }
  }

  if (tier === 'elite') {
    rollRouteDrinkDrop(user, combat.kills_total, pending);
  }

  recordBestiaryKillDrops(user, defeatedEnemyId, pendingBefore, snapshotBestiaryPending(pending));
  respawnEnemy(user, combat);

  const searchReduction = afkSearchReductionMs(combat.skill_nodes);
  const spread = AFK_SEARCH_DURATION_MAX_MS - AFK_SEARCH_DURATION_MIN_MS;
  const seeded = hashCombatSeed(`${user.id}:${combat.kills_total}:search`) % (spread + 1);
  combat.search_remaining_ms = Math.max(
    2_500,
    AFK_SEARCH_DURATION_MIN_MS + seeded - searchReduction,
  );
}

/** Derrota imediatamente o inimigo atual. Usado por itens que simulam patrulha. */
export function defeatCurrentEnemy(user: UserRecord, pending: AfkPendingReward): void {
  const combat = ensureCombat(user);
  combat.enemy_hp = 0;
  onEnemyDefeated(user, combat, pending);
}

/** Salva dano visual sem permitir cura, troca de alvo ou escrita atrasada. */
export function persistCurrentEnemyHp(
  user: UserRecord,
  expectedKillsTotal: number,
  expectedEnemyId: string,
  requestedHp: number,
): boolean {
  const combat = ensureCombat(user);
  if (combat.kills_total !== expectedKillsTotal || combat.enemy_id !== expectedEnemyId)
    return false;
  if (!Number.isFinite(requestedHp) || requestedHp <= 0) return false;

  const maxHp = getEnemyMaxHp(combat.enemy_id, getAfkRegionById(combat.region_id).chapter);
  combat.enemy_hp = Math.max(1, Math.min(combat.enemy_hp, maxHp, Math.floor(requestedHp)));
  combat.combat_last_at = new Date().toISOString();
  return true;
}

/** Persiste o combate visível sem deixar o próximo sync repetir esse tempo em AFK. */
export function persistVisibleHeroState(
  user: UserRecord,
  expectedKillsTotal: number,
  expectedEnemyId: string,
  requestedHp: number,
  defeatedRemainingMs: number,
): boolean {
  const combat = ensureCombat(user);
  if (combat.kills_total !== expectedKillsTotal || combat.enemy_id !== expectedEnemyId)
    return false;
  if (!Number.isFinite(requestedHp) || !Number.isFinite(defeatedRemainingMs)) return false;

  const heroMaxHp = afkHeroMaxHp(combat.skill_nodes);
  const hp = Math.max(0, Math.min(heroMaxHp, Math.floor(requestedHp)));
  const maximumDefeatMs = afkDefeatDurationMs(combat.skill_nodes);
  const remainingMs = hp <= 0 ? Math.max(1, Math.min(maximumDefeatMs, defeatedRemainingMs)) : 0;
  combat.hero_hp = hp;
  combat.defeated_remaining_ms = remainingMs;
  combat.hero_defeated_until =
    remainingMs > 0 ? new Date(Date.now() + remainingMs).toISOString() : null;
  combat.combat_last_at = new Date().toISOString();
  return true;
}

export function touchVisibleCombatClock(user: UserRecord): void {
  ensureCombat(user).combat_last_at = new Date().toISOString();
}

export function applyKill(user: UserRecord): void {
  const combat = ensureCombat(user);
  combat.enemy_hp = 0;
  onEnemyDefeated(user, combat, user.afk.pending);
}

function equippedDamage(
  user: UserRecord,
  combat: AfkCombatState,
): {
  kind: PatrolWeaponDamageKind;
  weaponId: string | null;
  damage: number;
  multiplier: number;
  intervalMs: number;
} {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const preferred = user.preferencias?.arma_preferida ?? 'arco';
  const kind: PatrolWeaponDamageKind =
    preferred === 'magia' && armas.magia_equipada
      ? 'magia'
      : preferred === 'espada'
        ? 'espada'
        : 'arco';
  const weaponId =
    kind === 'arco'
      ? armas.arco_equipado
      : kind === 'espada'
        ? armas.espada_equipada
        : armas.magia_equipada;
  const effect =
    kind === 'arco'
      ? 'bow_damage_pct'
      : kind === 'espada'
        ? 'sword_damage_pct'
        : 'magic_damage_pct';
  const multiplier = 1 + getAfkSkillTotal(combat.skill_nodes, effect) / 100;
  return {
    kind,
    weaponId: weaponId ?? null,
    damage: Math.max(1, Math.round(patrolHeroDamage(kind, weaponId) * multiplier)),
    multiplier,
    intervalMs: kind === 'arco' ? 1500 : kind === 'espada' ? 1900 : 2400,
  };
}

function defeatHero(combat: AfkCombatState): void {
  const duration = afkDefeatDurationMs(combat.skill_nodes);
  combat.hero_hp = 0;
  combat.defeated_remaining_ms = duration;
  combat.hero_defeated_until = new Date(Date.now() + duration).toISOString();
}

/**
 * Simulação autoritativa por eventos. Procura, ataques do herói, ataques dos
 * slimes, HP parcial e os 10 segundos de derrota sobrevivem ao fechamento.
 */
export function simulateOfflineCombat(user: UserRecord, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const combat = ensureCombat(user);
  const pending = user.afk.pending;
  const region = getAfkRegionById(combat.region_id);
  const hero = equippedDamage(user, combat);
  const heroMaxHp = afkHeroMaxHp(combat.skill_nodes);
  let remaining = Math.min(elapsedMs, 24 * 60 * 60 * 1000);
  let kills = 0;
  let events = 0;

  if (combat.enemy_hp <= 0) respawnEnemy(user, combat);
  if ((combat.hero_hp ?? 0) <= 0 && (combat.defeated_remaining_ms ?? 0) <= 0) {
    combat.hero_hp = heroMaxHp;
  }

  while (remaining > 0 && events < 100_000) {
    events += 1;

    if ((combat.defeated_remaining_ms ?? 0) > 0) {
      const step = Math.min(remaining, combat.defeated_remaining_ms!);
      combat.defeated_remaining_ms! -= step;
      remaining -= step;
      if (combat.defeated_remaining_ms! <= 0) {
        combat.hero_hp = heroMaxHp;
        combat.hero_defeated_until = null;
        combat.hero_attack_remaining_ms = 350;
        combat.enemy_attack_remaining_ms = getEnemyAttackIntervalSeconds(enemyTier(combat)) * 1000;
      }
      continue;
    }

    if ((combat.search_remaining_ms ?? 0) > 0) {
      const step = Math.min(remaining, combat.search_remaining_ms!);
      combat.search_remaining_ms! -= step;
      remaining -= step;
      continue;
    }

    combat.hero_attack_remaining_ms ??= hero.intervalMs;
    combat.enemy_attack_remaining_ms ??= getEnemyAttackIntervalSeconds(enemyTier(combat)) * 1000;
    if (combat.hero_attack_remaining_ms <= 0) combat.hero_attack_remaining_ms = hero.intervalMs;
    if (combat.enemy_attack_remaining_ms <= 0) {
      combat.enemy_attack_remaining_ms = getEnemyAttackIntervalSeconds(enemyTier(combat)) * 1000;
    }

    const step = Math.min(
      remaining,
      combat.hero_attack_remaining_ms,
      combat.enemy_attack_remaining_ms,
    );
    combat.hero_attack_remaining_ms -= step;
    combat.enemy_attack_remaining_ms -= step;
    remaining -= step;

    if (combat.hero_attack_remaining_ms <= 0) {
      const critSkill =
        hero.kind === 'arco'
          ? getAfkSkillTotal(combat.skill_nodes, 'bow_crit_pct')
          : hero.kind === 'espada'
            ? getAfkSkillTotal(combat.skill_nodes, 'sword_crit_pct')
            : 0;
      const critChance =
        resolvePatrolCritChancePercent(hero.kind, hero.weaponId ?? '', combat.enemy_id) + critSkill;
      const critRoll =
        hashCombatSeed(`${user.id}:${combat.kills_total}:${combat.enemy_hp}:crit`) % 10_000;
      const isCrit = critChance > 0 && critRoll < Math.round(critChance * 100);
      const resolved = resolvePatrolAttackDamage({
        kind: hero.kind,
        weaponId: hero.weaponId ?? '',
        enemyId: combat.enemy_id,
        critStreak: 0,
        isCrit,
      });
      const critDamageSkill = isCrit ? getAfkSkillTotal(combat.skill_nodes, 'crit_damage_pct') : 0;
      const damage = resolved.isHitKill
        ? combat.enemy_hp
        : Math.max(1, Math.round(resolved.damage * hero.multiplier * (1 + critDamageSkill / 100)));
      combat.enemy_hp = Math.max(0, combat.enemy_hp - damage);
      combat.hero_attack_remaining_ms = hero.intervalMs;
      if (combat.enemy_hp <= 0) {
        onEnemyDefeated(user, combat, pending);
        kills += 1;
        continue;
      }
    }

    if (combat.enemy_attack_remaining_ms <= 0) {
      const damage = getEnemyAttackDamage(
        combat.enemy_id,
        region.chapter,
        heroMaxHp,
        enemyTier(combat),
      );
      combat.enemy_attack_remaining_ms = getEnemyAttackIntervalSeconds(enemyTier(combat)) * 1000;
      if (!Number.isFinite(damage)) {
        defeatHero(combat);
      } else {
        combat.hero_hp = Math.max(0, (combat.hero_hp ?? heroMaxHp) - damage);
        if (combat.hero_hp <= 0) defeatHero(combat);
      }
    }
  }

  return kills;
}

/** Compatibilidade para consumíveis: agora usa a mesma simulação do AFK real. */
export function simulateOfflineKills(user: UserRecord, newMinutes: number): number {
  return simulateOfflineCombat(user, Math.max(0, newMinutes) * 60_000);
}

export function combatSnapshot(user: UserRecord) {
  const combat = ensureCombat(user);
  const snap = buildCombatSnapshot(combat);
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const defeatedRemaining = Math.max(0, combat.defeated_remaining_ms ?? 0);
  return {
    ...snap,
    hero_defeated_until:
      defeatedRemaining > 0 ? new Date(Date.now() + defeatedRemaining).toISOString() : null,
    hero_max_hp: afkHeroMaxHp(combat.skill_nodes),
    hero_damage_arco: patrolHeroDamage('arco', armas.arco_equipado),
    hero_damage_espada: patrolHeroDamage('espada', armas.espada_equipada),
    hero_damage_magia: patrolHeroDamage('magia', armas.magia_equipada),
  };
}
