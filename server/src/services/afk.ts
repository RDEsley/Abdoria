import type { UserDocument } from '../domain/User.js';
import {
  AFK_KILLS_PER_MINUTE,
  AFK_MAX_MINUTES,
  DORIA_BAG_ITEM_ID,
  ENERGY_DRINK_ITEM_ID,
  EXP_INSTANT_ITEM_ID,
  PATROL_CACHE_HOURS,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_ITEM_ID,
  type AfkPendingReward,
} from '../types/index.js';
import { afkCapReached, afkKillsForHours, buildAfkMetaFields } from '../../../shared/utils/afk.js';
import { grantAbdoria } from './economy.js';
import { addInventoryItem } from './inventory.js';
import { normalizePending, EMPTY_AFK_PENDING } from '../repositories/user-repository.js';
import { combatSnapshot, ensureCombat, simulateOfflineKills, defeatCurrentEnemy } from './afk-combat.js';
import { ensureBestiario } from './bestiario.js';
import { resolvePatrolArmas, type AfkEnemyId } from '../types/index.js';

const SECRET_TITLE_ID = 'titulo_secreto';

function ensureAfk(user: UserDocument): {
  last_seen_at: Date | string | null;
  minutos_acumulados: number;
  pending: AfkPendingReward;
} {
  if (!user.afk || typeof user.afk !== 'object') {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { ...EMPTY_AFK_PENDING },
    };
  }
  user.afk.pending = normalizePending(user.afk.pending);
  if (typeof user.afk.minutos_acumulados !== 'number') user.afk.minutos_acumulados = 0;
  return user.afk;
}

function applyAfkRewardBundle(user: UserDocument, bundle: AfkPendingReward): {
  claimed: AfkPendingReward;
  overflow_to_dorias: number;
} {
  const claimed = normalizePending(bundle);
  let overflow_to_dorias = 0;

  if (claimed.xp > 0) {
    user.gamificacao.nivel_xp += claimed.xp;
  }
  if (claimed.abdoria > 0) {
    grantAbdoria(user, claimed.abdoria);
  }
  if (claimed.energy_drinks > 0) {
    const result = addInventoryItem(user, ENERGY_DRINK_ITEM_ID, claimed.energy_drinks);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.route_drinks > 0) {
    const result = addInventoryItem(user, ROUTE_DRINK_ITEM_ID, claimed.route_drinks);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.exp_instant > 0) {
    const result = addInventoryItem(user, EXP_INSTANT_ITEM_ID, claimed.exp_instant);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.doria_bags > 0) {
    const result = addInventoryItem(user, DORIA_BAG_ITEM_ID, claimed.doria_bags);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  for (const cosmeticId of claimed.cosmetic_ids) {
    if (!user.cosmeticos.desbloqueados.includes(cosmeticId)) {
      user.cosmeticos.desbloqueados.push(cosmeticId);
    }
  }
  if (claimed.titulo_secreto && !user.cosmeticos.desbloqueados.includes(SECRET_TITLE_ID)) {
    user.cosmeticos.desbloqueados.push(SECRET_TITLE_ID);
  }
  if (claimed.weapon_ids.length > 0) {
    const armas = resolvePatrolArmas(user.preferencias.patrol_armas);
    for (const weaponId of claimed.weapon_ids) {
      if (!armas.desbloqueados.includes(weaponId)) {
        armas.desbloqueados.push(weaponId);
      }
    }
    user.preferencias.patrol_armas = armas;
  }

  return { claimed, overflow_to_dorias };
}

function simulateKillsIntoPending(user: UserDocument, pending: AfkPendingReward, kills: number): void {
  ensureCombat(user);
  for (let i = 0; i < kills; i += 1) {
    defeatCurrentEnemy(user, pending);
  }
}

/** Concede recompensas equivalentes a N horas de Exploração AFK (simula kills + drops). */
export function grantPatrolCacheRewards(
  user: UserDocument,
  hours = PATROL_CACHE_HOURS,
): AfkPendingReward {
  const pending: AfkPendingReward = { ...EMPTY_AFK_PENDING };
  simulateKillsIntoPending(user, pending, afkKillsForHours(hours));
  return applyAfkRewardBundle(user, pending).claimed;
}

/** Enche o baú pendente com loot equivalente a N horas (sem aplicar na conta). */
export function grantRouteDrinkRewardsToPending(
  user: UserDocument,
  hours = ROUTE_DRINK_HOURS,
): AfkPendingReward {
  const afk = ensureAfk(user);
  simulateKillsIntoPending(user, afk.pending, afkKillsForHours(hours));
  return normalizePending(afk.pending);
}

export function syncAfkRewards(user: UserDocument, now = new Date()): AfkEnemyId[] {
  const before = new Set(ensureBestiario(user));
  const afk = ensureAfk(user);
  const lastSeen = afk.last_seen_at ? new Date(afk.last_seen_at) : now;

  if (!afk.last_seen_at) {
    afk.last_seen_at = now.toISOString();
    return collectNewBestiaryUnlocks(before, user);
  }

  const already = afk.minutos_acumulados ?? 0;

  if (already >= AFK_MAX_MINUTES) {
    afk.minutos_acumulados = AFK_MAX_MINUTES;
    afk.last_seen_at = now.toISOString();
    return collectNewBestiaryUnlocks(before, user);
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeen.getTime());
  let newMinutes = Math.floor(elapsedMs / 60_000);
  if (newMinutes <= 0) {
    afk.last_seen_at = now.toISOString();
    return collectNewBestiaryUnlocks(before, user);
  }

  const room = Math.max(0, AFK_MAX_MINUTES - already);
  newMinutes = Math.min(newMinutes, room);

  const totalMinutes = already + newMinutes;

  simulateOfflineKills(user, newMinutes);

  afk.minutos_acumulados = totalMinutes;
  afk.last_seen_at = now.toISOString();
  return collectNewBestiaryUnlocks(before, user);
}

function collectNewBestiaryUnlocks(before: Set<AfkEnemyId>, user: UserDocument): AfkEnemyId[] {
  return ensureBestiario(user).filter((id) => !before.has(id));
}

export function hasAfkRewardsToClaim(afk: { pending?: AfkPendingReward | null } | null | undefined): boolean {
  const p = normalizePending(afk?.pending);
  return (
    p.xp > 0
    || p.abdoria > 0
    || p.energy_drinks > 0
    || p.route_drinks > 0
    || p.exp_instant > 0
    || p.doria_bags > 0
    || p.cosmetic_ids.length > 0
    || p.weapon_ids.length > 0
    || p.titulo_secreto
  );
}

export function claimAfkRewards(user: UserDocument): {
  claimed: AfkPendingReward;
  overflow_to_dorias: number;
} {
  const afk = ensureAfk(user);
  const { claimed, overflow_to_dorias } = applyAfkRewardBundle(user, afk.pending);

  afk.pending = { ...EMPTY_AFK_PENDING };
  afk.minutos_acumulados = 0;
  afk.last_seen_at = new Date().toISOString();

  return { claimed, overflow_to_dorias };
}

export function touchAfkPresence(user: UserDocument): AfkEnemyId[] {
  return syncAfkRewards(user);
}

export function afkResponsePayload(
  user: UserDocument,
  extra?: { arma_preferida?: string; route_drink_count?: number },
  bestiario_novos: AfkEnemyId[] = [],
) {
  const minutos = user.afk?.minutos_acumulados ?? 0;
  return {
    minutos_acumulados: minutos,
    pending: user.afk?.pending ?? { ...EMPTY_AFK_PENDING },
    has_rewards: hasAfkRewardsToClaim(user.afk),
    combat: combatSnapshot(user),
    bestiario_novos,
    ...buildAfkMetaFields(minutos),
    ...extra,
  };
}

export { SECRET_TITLE_ID };
