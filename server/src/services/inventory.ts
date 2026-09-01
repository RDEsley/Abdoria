import type { UserRecord } from '../domain/User.js';
import {
  FROZEN_STREAK_ITEM_ID,
  INVENTORY_STACK_CAP,
  INVENTORY_STACK_CAPPED_ITEM_IDS,
  type Inventario,
  type InventoryItemId,
} from '../types/index.js';

const LEGACY_ENERGY_DRINK_ID = 'energy_drink';

export interface AddInventoryResult {
  added: number;
  discarded: number;
}

function ensureInventario(user: UserRecord): Inventario {
  if (!user.inventario || !Array.isArray(user.inventario.itens)) user.inventario = { itens: [] };
  const inventory = user.inventario as Inventario;
  const legacy = inventory.itens.find((entry) => entry.item_id === LEGACY_ENERGY_DRINK_ID);
  if (legacy?.quantidade) {
    const current = inventory.itens.find((entry) => entry.item_id === FROZEN_STREAK_ITEM_ID);
    if (current) current.quantidade += legacy.quantidade;
    else inventory.itens.push({ item_id: FROZEN_STREAK_ITEM_ID, quantidade: legacy.quantidade });
    inventory.itens = inventory.itens.filter((entry) => entry.item_id !== LEGACY_ENERGY_DRINK_ID);
  }
  return inventory;
}

export function getItemCount(user: UserRecord, itemId: InventoryItemId): number {
  return ensureInventario(user).itens.find((entry) => entry.item_id === itemId)?.quantidade ?? 0;
}

function isStackCappedItem(itemId: InventoryItemId): boolean {
  return INVENTORY_STACK_CAPPED_ITEM_IDS.includes(itemId);
}

export function addInventoryItem(
  user: UserRecord,
  itemId: InventoryItemId | string,
  amount: number,
): AddInventoryResult {
  const normalizedId = itemId === LEGACY_ENERGY_DRINK_ID ? FROZEN_STREAK_ITEM_ID : itemId;
  if (amount <= 0) return { added: 0, discarded: 0 };
  const inventory = ensureInventario(user);
  const entry = inventory.itens.find((item) => item.item_id === normalizedId);
  const current = entry?.quantidade ?? 0;
  const space = isStackCappedItem(normalizedId)
    ? Math.max(0, INVENTORY_STACK_CAP - current)
    : amount;
  const added = Math.min(amount, space);
  if (added > 0) {
    if (entry) entry.quantidade += added;
    else inventory.itens.push({ item_id: normalizedId, quantidade: added });
  }
  return { added, discarded: amount - added };
}

export function consumeInventoryItem(
  user: UserRecord,
  itemId: InventoryItemId,
  amount = 1,
): boolean {
  if (amount <= 0) return true;
  const inventory = ensureInventario(user);
  const entry = inventory.itens.find((item) => item.item_id === itemId);
  if (!entry || entry.quantidade < amount) return false;
  entry.quantidade -= amount;
  inventory.itens = inventory.itens.filter((item) => item.quantidade > 0);
  return true;
}

export function readInventarioSummary(user: UserRecord) {
  return {
    frozen_streak: getItemCount(user, FROZEN_STREAK_ITEM_ID),
    stack_cap: INVENTORY_STACK_CAP,
  };
}
