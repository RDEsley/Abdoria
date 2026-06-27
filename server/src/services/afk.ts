import type { UserDocument } from '../domain/User.js';
import {
  AFK_KILLS_PER_MINUTE,
  AFK_MAX_MINUTES,
  ENERGY_DRINK_ITEM_ID,
  PATROL_CACHE_HOURS,
  type AfkPendingReward,
} from '../types/index.js';
import { afkCapReached, afkKillsForHours, buildAfkMetaFields } from '../../../shared/utils/afk.js';
import { grantAbdoria } from './economy.js';
import { addInventoryItem } from './inventory.js';
import { normalizePending, EMPTY_AFK_PENDING } from '../repositories/user-repository.js';
import { combatSnapshot, ensureCombat, simulateOfflineKills, defeatCurrentEnemy } from './afk-combat.js';

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

function applyAfkRewardBundle(user: UserDocument, bundle: AfkPendingReward): AfkPendingReward {
  const claimed = normalizePending(bundle);

  if (claimed.xp > 0) {
    user.gamificacao.nivel_xp += claimed.xp;
  }
  if (claimed.abdoria > 0) {
    grantAbdoria(user, claimed.abdoria);
  }
  if (claimed.energy_drinks > 0) {
    addInventoryItem(user, ENERGY_DRINK_ITEM_ID, claimed.energy_drinks);
  }
  for (const cosmeticId of claimed.cosmetic_ids) {
    if (!user.cosmeticos.desbloqueados.includes(cosmeticId)) {
      user.cosmeticos.desbloqueados.push(cosmeticId);
    }
  }
  if (claimed.titulo_secreto && !user.cosmeticos.desbloqueados.includes(SECRET_TITLE_ID)) {
    user.cosmeticos.desbloqueados.push(SECRET_TITLE_ID);
  }

  return claimed;
}

/** Concede recompensas equivalentes a N horas de Exploração AFK (simula kills + drops). */
export function grantPatrolCacheRewards(
  user: UserDocument,
  hours = PATROL_CACHE_HOURS,
): AfkPendingReward {
  const kills = afkKillsForHours(hours);
  const pending: AfkPendingReward = { ...EMPTY_AFK_PENDING };

  ensureCombat(user);

  for (let i = 0; i < kills; i += 1) {
    defeatCurrentEnemy(user, pending);
  }

  return applyAfkRewardBundle(user, pending);
}

export function syncAfkRewards(user: UserDocument, now = new Date()) {
  const afk = ensureAfk(user);
  const lastSeen = afk.last_seen_at ? new Date(afk.last_seen_at) : now;

  if (!afk.last_seen_at) {
    afk.last_seen_at = now.toISOString();
    return afk;
  }

  const already = afk.minutos_acumulados ?? 0;

  if (already >= AFK_MAX_MINUTES) {
    afk.minutos_acumulados = AFK_MAX_MINUTES;
    afk.last_seen_at = now.toISOString();
    return afk;
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeen.getTime());
  let newMinutes = Math.floor(elapsedMs / 60_000);
  if (newMinutes <= 0) {
    afk.last_seen_at = now.toISOString();
    return afk;
  }

  const room = Math.max(0, AFK_MAX_MINUTES - already);
  newMinutes = Math.min(newMinutes, room);

  const totalMinutes = already + newMinutes;

  simulateOfflineKills(user, newMinutes);

  afk.minutos_acumulados = totalMinutes;
  afk.last_seen_at = now.toISOString();
  return afk;
}

export function hasAfkRewardsToClaim(afk: { pending?: AfkPendingReward | null } | null | undefined): boolean {
  const p = normalizePending(afk?.pending);
  return p.xp > 0 || p.abdoria > 0 || p.energy_drinks > 0 || p.cosmetic_ids.length > 0 || p.titulo_secreto;
}

export function claimAfkRewards(user: UserDocument): AfkPendingReward {
  const afk = ensureAfk(user);
  const claimed = applyAfkRewardBundle(user, afk.pending);

  afk.pending = { ...EMPTY_AFK_PENDING };
  afk.minutos_acumulados = 0;
  afk.last_seen_at = new Date().toISOString();

  return claimed;
}

export function touchAfkPresence(user: UserDocument): void {
  syncAfkRewards(user);
}

export function afkResponsePayload(
  user: UserDocument,
  extra?: { arma_preferida?: string },
) {
  const minutos = user.afk?.minutos_acumulados ?? 0;
  return {
    minutos_acumulados: minutos,
    pending: user.afk?.pending ?? { ...EMPTY_AFK_PENDING },
    has_rewards: hasAfkRewardsToClaim(user.afk),
    combat: combatSnapshot(user),
    ...buildAfkMetaFields(minutos),
    ...extra,
  };
}

export { SECRET_TITLE_ID };
