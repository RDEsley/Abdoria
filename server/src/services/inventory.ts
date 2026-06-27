import type { UserDocument } from '../domain/User.js';
import {
  DEFAULT_XP_DIARIO,
  ENERGY_DRINK_BONUS_XP,
  ENERGY_DRINK_ITEM_ID,
  INVENTORY_STACK_CAP,
  INVENTORY_STACK_CAPPED_ITEM_IDS,
  PATROL_CACHE_ITEM_ID,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_ITEM_ID,
  type Inventario,
  type InventoryItemId,
  type AfkPendingReward,
} from '../types/index.js';
import { grantPatrolCacheRewards, grantRouteDrinkRewardsToPending, hasAfkRewardsToClaim } from './afk.js';
import { grantAbdoria } from './economy.js';
import { resetXpDiarioIfNeeded } from './gamification.js';

export interface AddInventoryResult {
  added: number;
  overflow_to_dorias: number;
}

export function isStackCappedItem(itemId: InventoryItemId): boolean {
  return INVENTORY_STACK_CAPPED_ITEM_IDS.includes(itemId);
}

export function ensureInventario(user: UserDocument): Inventario {
  if (!user.inventario || !Array.isArray(user.inventario.itens)) {
    user.inventario = { itens: [] } as unknown as UserDocument['inventario'];
  }
  return user.inventario as unknown as Inventario;
}

export function getItemCount(user: UserDocument, itemId: InventoryItemId): number {
  const inv = ensureInventario(user);
  return inv.itens.find((e) => e.item_id === itemId)?.quantidade ?? 0;
}

export function addInventoryItem(
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
  const entry = inv.itens.find((e: { item_id: InventoryItemId; quantidade: number }) => e.item_id === itemId);
  if (!entry || entry.quantidade < amount) return false;
  entry.quantidade -= amount;
  if (entry.quantidade <= 0) {
    inv.itens = inv.itens.filter((e: { item_id: InventoryItemId; quantidade: number }) => e.item_id !== itemId || e.quantidade > 0);
  }
  return true;
}

function ensureXpDiarioBonusFields(user: UserDocument): void {
  if (!user.xp_diario) {
    user.xp_diario = { ...DEFAULT_XP_DIARIO };
  }
  if (typeof user.xp_diario.bonus_pool_restante !== 'number') {
    user.xp_diario.bonus_pool_restante = 0;
  }
  if (typeof user.xp_diario.bonus_pool_total !== 'number') {
    user.xp_diario.bonus_pool_total = 0;
  }
}

/** Usa Energy Drink: +100 XP diário extra até preencher o pool. */
export function useEnergyDrink(user: UserDocument, quantity = 1): { ok: true; bonus_added: number } | { ok: false; error: string } {
  if (quantity < 1) return { ok: false, error: 'Quantidade inválida.' };
  resetXpDiarioIfNeeded(user);
  ensureXpDiarioBonusFields(user);

  const available = getItemCount(user, ENERGY_DRINK_ITEM_ID);
  if (available < quantity) {
    return { ok: false, error: 'Você não tem Energy Drink suficiente.' };
  }

  if (!consumeInventoryItem(user, ENERGY_DRINK_ITEM_ID, quantity)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  const bonusAdded = ENERGY_DRINK_BONUS_XP * quantity;
  user.xp_diario.bonus_pool_restante += bonusAdded;
  user.xp_diario.bonus_pool_total += bonusAdded;

  return { ok: true, bonus_added: bonusAdded };
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

/** Usa Route Drink na exploração: enche o baú com 1h de loot (baú precisa estar vazio). */
export function useRouteDrinkInExploration(
  user: UserDocument,
): { ok: true; hours: number } | { ok: false; error: string } {
  if (hasAfkRewardsToClaim(user.afk)) {
    return { ok: false, error: 'Esvazie o baú de exploração antes de usar o Route Drink.' };
  }

  if (getItemCount(user, ROUTE_DRINK_ITEM_ID) < 1) {
    return { ok: false, error: 'Você não tem Route Drink.' };
  }

  if (!consumeInventoryItem(user, ROUTE_DRINK_ITEM_ID, 1)) {
    return { ok: false, error: 'Não foi possível consumir o item.' };
  }

  grantRouteDrinkRewardsToPending(user, ROUTE_DRINK_HOURS);
  return { ok: true, hours: ROUTE_DRINK_HOURS };
}

export function readInventarioSummary(user: UserDocument) {
  ensureInventario(user);
  return {
    energy_drink: getItemCount(user, ENERGY_DRINK_ITEM_ID),
    route_drink: getItemCount(user, ROUTE_DRINK_ITEM_ID),
    bau_patrulha: getItemCount(user, PATROL_CACHE_ITEM_ID),
    stack_cap: INVENTORY_STACK_CAP,
    itens: [...user.inventario!.itens],
  };
}
