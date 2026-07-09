import type {
  CosmeticKind,
  EquipCosmeticResponse,
  IUserDocument,
  LojaDiaria,
  LojaDiariaSlot,
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

export function claimDailyShopSlot(slot: number): Promise<{
  user: IUserDocument;
  loja_diaria: LojaDiaria;
  overflow_to_dorias?: number;
}> {
  return fetchJson('/shop/daily/claim', { method: 'POST', body: JSON.stringify({ slot }) });
}

export function claimFreeDailyShopRewards(): Promise<{
  user: IUserDocument;
  claimed: LojaDiariaSlot[];
  loja_diaria: LojaDiaria;
  overflow_to_dorias?: number;
}> {
  return fetchJson('/shop/daily/claim-free', { method: 'POST', body: '{}' });
}

export function redeemGiftCode(code: string): Promise<RedeemCodeResponse> {
  return fetchJson('/shop/redeem-code', { method: 'POST', body: JSON.stringify({ code }) });
}
