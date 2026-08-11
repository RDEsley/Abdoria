import type { IUserDocument, PatrolShopResponse, PatrolWeaponKind } from '@/types';
import { fetchJson } from './client';

export function getPatrolShop(): Promise<PatrolShopResponse> {
  return fetchJson('/patrol-shop');
}

export function purchasePatrolWeapon(id: string): Promise<{
  user: IUserDocument;
  abdoria_gasta: number;
}> {
  return fetchJson('/patrol-shop/purchase', { method: 'POST', body: JSON.stringify({ id }) });
}

export function equipPatrolWeapon(
  kind: PatrolWeaponKind,
  id: string,
): Promise<{ user: IUserDocument }> {
  return fetchJson('/patrol-shop/equip', { method: 'PATCH', body: JSON.stringify({ kind, id }) });
}

export function sellPatrolMaterial(
  id: string,
  quantity: number | 'all',
): Promise<{
  user: IUserDocument;
  quantity_sold: number;
  coins_gained: number;
  shop: PatrolShopResponse;
}> {
  return fetchJson('/patrol-shop/materials/sell', {
    method: 'POST',
    body: JSON.stringify({ id, quantity }),
  });
}

export function sellPatrolMaterialsBulk(tier: 'all' | 'common' | 'elite' | 'boss'): Promise<{
  user: IUserDocument;
  quantity_sold: number;
  coins_gained: number;
  shop: PatrolShopResponse;
}> {
  return fetchJson('/patrol-shop/materials/sell-bulk', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}
