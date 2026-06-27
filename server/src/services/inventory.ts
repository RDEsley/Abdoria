import type { UserDocument } from '../domain/User.js';
import {
  DORIA_BAG_ITEM_ID,
  DORIA_BAG_MAX,
  DORIA_BAG_MIN,
  EXP_INSTANT_ITEM_ID,
  EXP_INSTANT_XP,
  FROZEN_STREAK_ITEM_ID,
  INVENTORY_STACK_CAP,
  INVENTORY_STACK_CAPPED_ITEM_IDS,
  PATROL_CACHE_ITEM_ID,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_ITEM_ID,
  type Inventario,
  type InventoryItemId,
  type AfkPendingReward,
} from '../types/index.js';
import { grantPatrolCacheRewards, grantRouteDrinkRewards } from './afk.js';
import { grantAbdoria } from './economy.js';
import { hashKillSeed } from './afk-rolls.js';

const LEGACY_ENERGY_DRINK_ID = 'energy_drink';

export interface AddInventoryResult {
  added: number;
  overflow_to_dorias: number;
}

export function isStackCappedItem(itemId: InventoryItemId): boolean {
  return INVENTORY_STACK_CAPPED_ITEM_IDS.includes(itemId);
}

function migrateLegacyInventoryItems(inv: Inventario): void {
  const legacy = inv.itens.find((e) => (e.item_id as string) === LEGACY_ENERGY_DRINK_ID);
  if (!legacy || legacy.quantidade <= 0) return;

  const frozen = inv.itens.find((e) => e.item_id === FROZEN_STREAK_ITEM_ID);
  if (frozen) {
    frozen.quantidade += legacy.quantidade;
  } else {
    inv.itens.push({ item_id: FROZEN_STREAK_ITEM_ID, quantidade: legacy.quantidade });
  }
  inv.itens = inv.itens.filter((e) => (e.item_id as string) !== LEGACY_ENERGY_DRINK_ID);
}

export function ensureInventario(user: UserDocument): Inventario {
  if (!user.inventario || !Array.isArray(user.inventario.itens)) {
    user.inventario = { itens: [] } as unknown as UserDocument['inventario'];
  }
  const inv = user.inventario as unknown as Inventario;
  migrateLegacyInventoryItems(inv);
  return inv;
}

export function getItemCount(user: UserDocument, itemId: InventoryItemId): number {
  const inv = ensureInventario(user);
  if (itemId === FROZEN_STREAK_ITEM_ID) {
    const legacy = inv.itens.find((e) => (e.item_id as string) === LEGACY_ENERGY_DRINK_ID)?.quantidade ?? 0;
    const current = inv.itens.find((e) => e.item_id === FROZEN_STREAK_ITEM_ID)?.quantidade ?? 0;
    return current + legacy;
  }
  return inv.itens.find((e) => e.item_id === itemId)?.quantidade ?? 0;
}

function resolveInventoryItemId(itemId: string): InventoryItemId {
  if (itemId === LEGACY_ENERGY_DRINK_ID) return FROZEN_STREAK_ITEM_ID;
  return itemId as InventoryItemId;
}

export function addInventoryItem(
  user: UserDocument,
  itemId: InventoryItemId | string,
  amount: number,
): AddInventoryResult {
  return addInventoryItemInternal(user, resolveInventoryItemId(itemId), amount);
}

function addInventoryItemInternal(
  user: UserDocument,
  itemId: InventoryItemId,
  amount: number,
): AddInventoryResult {
  if (amount <= 0) return { added: 0, overflow_to_dorias: 0 };

  const inv = ensureInventario(user);
  const entry = inv.itens.find((e: { item_id: InventoryItemId; quantidade: number }) => e.item_id === itemId);
  const current = entry?.quantidade ?? 0;

  let added = amount;
  let overflow = 0;

  if (isStackCappedItem(itemId)) {
    const space = Math.max(0, INVENTORY_STACK_CAP - current);
    added = Math.min(amount, space);
    overflow = amount - added;
  }

  if (added > 0) {
    if (entry) {
      entry.quantidade = current + added;
    } else {
      inv.itens.push({ item_id: itemId, quantidade: added });
    }
  }

  if (overflow > 0) {
    grantAbdoria(user, overflow);
  }

  return { added, overflow_to_dorias: overflow };
}

export function consumeInventoryItem(user: UserDocument, itemId: InventoryItemId, amount = 1): boolean {
  if (amount <= 0) return true;
  const inv = ensureInventario(user);
  migrateLegacyInventoryItems(inv);
  const entry = inv.itens.find((e: { item_id: InventoryItemId; quantidade: number }) => e.item_id === itemId);
  if (!entry || entry.quantidade < amount) return false;
  entry.quantidade -= amount;
  if (entry.quantidade <= 0) {
    inv.itens = inv.itens.filter((e: { item_id: InventoryItemId; quantidade: number }) => e.item_id !== itemId || e.quantidade > 0);
  }
  return true;
}

/** Usa Baú da Exploração: recompensas equivalentes a 6h de Exploração AFK. */
export function usePatrolCache(
  user: UserDocument,
): { ok: true; claimed: AfkPendingReward } | { ok: false; error: string } {
  const available = getItemCount(user, PATROL_CACHE_ITEM_ID);
  if (available < 1) {
    return { ok: false, error: 'Você não tem Baú da Exploração.' };
  }

  if (!consumeInventoryItem(user, PATROL_CACHE_ITEM_ID, 1)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  const claimed = grantPatrolCacheRewards(user);
  return { ok: true, claimed };
}

/** Usa Route Drink: aplica 1h de loot direto na conta (animação no cliente). */
export function useRouteDrinkInExploration(
  user: UserDocument,
):
  | { ok: true; hours: number; claimed: AfkPendingReward; overflow_to_dorias: number }
  | { ok: false; error: string } {
  if (getItemCount(user, ROUTE_DRINK_ITEM_ID) < 1) {
    return { ok: false, error: 'Você não tem Route Drink.' };
  }

  if (!consumeInventoryItem(user, ROUTE_DRINK_ITEM_ID, 1)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  const { claimed, overflow_to_dorias } = grantRouteDrinkRewards(user, ROUTE_DRINK_HOURS);
  return { ok: true, hours: ROUTE_DRINK_HOURS, claimed, overflow_to_dorias };
}

function rollDoriaBagAmount(user: UserDocument, salt: number): number {
  const span = DORIA_BAG_MAX - DORIA_BAG_MIN + 1;
  const roll = hashKillSeed(String(user.id), salt) % span;
  return DORIA_BAG_MIN + roll;
}

/** EXP Instantâneo: +10 XP por unidade (ou toda a stack). */
export function useExpInstant(
  user: UserDocument,
  quantity?: number,
): { ok: true; xp_ganho: number; quantity_used: number } | { ok: false; error: string } {
  const available = getItemCount(user, EXP_INSTANT_ITEM_ID);
  if (available < 1) {
    return { ok: false, error: 'Você não tem EXP Instantâneo.' };
  }

  const useQty = quantity == null ? available : Math.max(1, Math.min(quantity, available));
  if (!consumeInventoryItem(user, EXP_INSTANT_ITEM_ID, useQty)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  const xpGanho = EXP_INSTANT_XP * useQty;
  user.gamificacao.nivel_xp += xpGanho;
  return { ok: true, xp_ganho: xpGanho, quantity_used: useQty };
}

/** Bolsa de Dorias: 4–21 Dorias aleatórias por unidade. */
export function useDoriaBag(
  user: UserDocument,
  quantity = 1,
): { ok: true; abdoria_ganha: number; rolls: number[]; quantity_used: number } | { ok: false; error: string } {
  if (quantity < 1) return { ok: false, error: 'Quantidade inválida.' };

  const available = getItemCount(user, DORIA_BAG_ITEM_ID);
  if (available < quantity) {
    return { ok: false, error: 'Você não tem Bolsa de Dorias suficiente.' };
  }

  if (!consumeInventoryItem(user, DORIA_BAG_ITEM_ID, quantity)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  const rolls: number[] = [];
  let total = 0;
  const baseSalt = Date.now() % 1_000_000;
  for (let i = 0; i < quantity; i += 1) {
    const amount = rollDoriaBagAmount(user, baseSalt + i + 1);
    rolls.push(amount);
    total += amount;
  }
  grantAbdoria(user, total);
  return { ok: true, abdoria_ganha: total, rolls, quantity_used: quantity };
}

export function readInventarioSummary(user: UserDocument) {
  ensureInventario(user);
  return {
    frozen_streak: getItemCount(user, FROZEN_STREAK_ITEM_ID),
    route_drink: getItemCount(user, ROUTE_DRINK_ITEM_ID),
    bau_patrulha: getItemCount(user, PATROL_CACHE_ITEM_ID),
    exp_instant: getItemCount(user, EXP_INSTANT_ITEM_ID),
    doria_bag: getItemCount(user, DORIA_BAG_ITEM_ID),
    stack_cap: INVENTORY_STACK_CAP,
    itens: [...user.inventario!.itens],
  };
}
