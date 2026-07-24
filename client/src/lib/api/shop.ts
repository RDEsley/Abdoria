import type {
  CosmeticKind,
  EquipCosmeticResponse,
  IUserDocument,
  RedeemCodeResponse,
  ShopResponse,
} from '@/types';
import { fetchJson } from './client';

export function getShop(): Promise<ShopResponse> {
  return fetchJson('/shop');
}

export function purchaseShopItem(
  id: string,
): Promise<{ user: IUserDocument; abdoria_gasta?: number }> {
  return fetchJson('/shop/purchase', { method: 'POST', body: JSON.stringify({ id }) });
}

export function equipShopItem(kind: CosmeticKind, id: string): Promise<EquipCosmeticResponse> {
  return fetchJson('/shop/equip', { method: 'PATCH', body: JSON.stringify({ kind, id }) });
}

export function redeemGiftCode(code: string): Promise<RedeemCodeResponse> {
  return fetchJson('/shop/redeem-code', { method: 'POST', body: JSON.stringify({ code }) });
}

/** Limpa a fila de celebrações de cosmético desbloqueado (depois do reveal). */
export function ackCosmeticCelebration(): Promise<{ user: IUserDocument }> {
  return fetchJson('/shop/celebracao/ack', { method: 'POST' });
}
