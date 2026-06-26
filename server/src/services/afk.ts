import type { UserDocument } from '../domain/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import {
  AFK_MAX_MINUTES,
  AFK_REWARD_INTERVAL_MINUTES,
  ENERGY_DRINK_ITEM_ID,
  type AfkPendingReward,
  type CosmeticRarity,
} from '../types/index.js';
import { grantAbdoria } from './economy.js';
import { addInventoryItem } from './inventory.js';
import { normalizePending, EMPTY_AFK_PENDING } from '../repositories/user-repository.js';

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

function hashIntervalSeed(userId: string, intervalIndex: number): number {
  let h = 2166136261;
  const s = `${userId}:${intervalIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickLegendaryCosmeticId(user: UserDocument): string | null {
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const candidates = COSMETICS.filter(
    (c) => c.raridade === 'lendario' && !unlocked.has(c.id) && c.unlock.tipo === 'moedas',
  );
  if (candidates.length === 0) {
    const anyLegendary = COSMETICS.filter((c) => (c.raridade as CosmeticRarity) === 'lendario' && !unlocked.has(c.id));
    if (anyLegendary.length === 0) return null;
    const idx = hashIntervalSeed(String(user.id), Date.now()) % anyLegendary.length;
    return anyLegendary[idx]?.id ?? null;
  }
  const idx = hashIntervalSeed(String(user.id), Date.now()) % candidates.length;
  return candidates[idx]?.id ?? null;
}

/** Recompensa a cada 30 min — raridades mais difíceis. */
function rollIntervalReward(user: UserDocument, intervalIndex: number, pending: AfkPendingReward): void {
  const roll = hashIntervalSeed(String(user.id), intervalIndex) % 10000;

  if (roll >= 9999) {
    pending.titulo_secreto = true;
    return;
  }
  if (roll >= 9995) {
    const cosmeticId = pickLegendaryCosmeticId(user);
    if (cosmeticId) pending.cosmetic_ids.push(cosmeticId);
    return;
  }
  if (roll >= 9600) {
    pending.energy_drinks += 1;
    return;
  }
  if (roll >= 8500) {
    pending.abdoria += 1;
    return;
  }
  pending.xp += 1;
}

export function syncAfkRewards(user: UserDocument, now = new Date()) {
  const afk = ensureAfk(user);
  const lastSeen = afk.last_seen_at ? new Date(afk.last_seen_at) : now;

  if (!afk.last_seen_at) {
    afk.last_seen_at = now.toISOString();
    return afk;
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeen.getTime());
  let newMinutes = Math.floor(elapsedMs / 60_000);
  if (newMinutes <= 0) {
    afk.last_seen_at = now.toISOString();
    return afk;
  }

  const already = afk.minutos_acumulados ?? 0;
  const room = Math.max(0, AFK_MAX_MINUTES - already);
  newMinutes = Math.min(newMinutes, room);

  const totalMinutes = already + newMinutes;
  const prevIntervals = Math.floor(already / AFK_REWARD_INTERVAL_MINUTES);
  const newIntervals = Math.floor(totalMinutes / AFK_REWARD_INTERVAL_MINUTES);

  for (let i = prevIntervals; i < newIntervals; i += 1) {
    rollIntervalReward(user, i, afk.pending);
  }

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
  const claimed = normalizePending(afk.pending);

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

  afk.pending = { ...EMPTY_AFK_PENDING };
  afk.minutos_acumulados = 0;
  afk.last_seen_at = new Date().toISOString();

  return claimed;
}

export function touchAfkPresence(user: UserDocument): void {
  syncAfkRewards(user);
}

export { SECRET_TITLE_ID };
