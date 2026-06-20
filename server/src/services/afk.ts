import type { UserDocument } from '../models/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import {
  AFK_MAX_MINUTES,
  ENERGY_DRINK_ITEM_ID,
  type AfkPendingReward,
  type CosmeticRarity,
} from '../types/index.js';
import { grantAbdoria } from './economy.js';
import { addInventoryItem } from './inventory.js';

const SECRET_TITLE_ID = 'titulo_secreto';

function ensureAfk(user: UserDocument): {
  last_seen_at: Date | null;
  minutos_acumulados: number;
  pending: AfkPendingReward;
} {
  if (!user.afk || typeof user.afk !== 'object') {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false },
    } as UserDocument['afk'];
  }
  const afk = user.afk as {
    last_seen_at: Date | null;
    minutos_acumulados: number;
    pending: AfkPendingReward;
  };
  if (!afk.pending) {
    afk.pending = { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false };
  }
  if (typeof afk.minutos_acumulados !== 'number') afk.minutos_acumulados = 0;
  return afk;
}

function hashMinuteSeed(userId: string, minuteIndex: number): number {
  let h = 2166136261;
  const s = `${userId}:${minuteIndex}`;
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
    const idx = hashMinuteSeed(String(user._id), Date.now()) % anyLegendary.length;
    return anyLegendary[idx]?.id ?? null;
  }
  const idx = hashMinuteSeed(String(user._id), Date.now()) % candidates.length;
  return candidates[idx]?.id ?? null;
}

function rollMinuteReward(user: UserDocument, minuteIndex: number, pending: AfkPendingReward): void {
  const roll = hashMinuteSeed(String(user._id), minuteIndex) % 10000;

  if (roll >= 9990) {
    pending.titulo_secreto = true;
    return;
  }
  if (roll >= 9950) {
    const cosmeticId = pickLegendaryCosmeticId(user);
    if (cosmeticId) pending.cosmetic_ids.push(cosmeticId);
    return;
  }
  if (roll >= 9500) {
    pending.energy_drinks += 1;
    return;
  }
  if (roll >= 9000) {
    pending.abdoria += 1;
    return;
  }
  pending.xp += 1;
}

/** Simula recompensas AFK desde last_seen (máx. 24h). */
export function syncAfkRewards(user: UserDocument, now = new Date()) {
  const afk = ensureAfk(user);
  const lastSeen = afk.last_seen_at instanceof Date ? afk.last_seen_at : now;

  if (!afk.last_seen_at) {
    afk.last_seen_at = now;
    return afk;
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeen.getTime());
  let newMinutes = Math.floor(elapsedMs / 60_000);
  if (newMinutes <= 0) {
    afk.last_seen_at = now;
    return afk;
  }

  const already = afk.minutos_acumulados ?? 0;
  const room = Math.max(0, AFK_MAX_MINUTES - already);
  newMinutes = Math.min(newMinutes, room);

  for (let i = 0; i < newMinutes; i += 1) {
    rollMinuteReward(user, already + i, afk.pending);
  }

  afk.minutos_acumulados = already + newMinutes;
  afk.last_seen_at = now;
  return afk;
}

export function hasAfkRewardsToClaim(afk: { pending?: AfkPendingReward | null } | null | undefined): boolean {
  const p = afk?.pending;
  if (!p) return false;
  return p.xp > 0 || p.abdoria > 0 || p.energy_drinks > 0 || p.cosmetic_ids.length > 0 || p.titulo_secreto;
}

export function claimAfkRewards(user: UserDocument): AfkPendingReward {
  const afk = ensureAfk(user);
  const claimed = { ...afk.pending };

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

  afk.pending = { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false };
  afk.minutos_acumulados = 0;
  afk.last_seen_at = new Date();

  return claimed;
}

export function touchAfkPresence(user: UserDocument): void {
  syncAfkRewards(user);
}

export { SECRET_TITLE_ID };
