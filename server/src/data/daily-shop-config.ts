import type {
  DailyRewardRarity,
  DailyRewardType,
  DailyShopPaidOfferKind,
  DailyShopSlotKind,
  LojaDiariaSlot,
} from '../types/index.js';
import {
  abdoriaCostForXpReward,
  xpCostForAbdoriaReward,
} from '../types/index.js';

export const DAILY_RARITY_WEIGHTS: Record<DailyRewardRarity, number> = {
  comum: 45,
  incomum: 30,
  raro: 18,
  epico: 7,
};

/** Recompensa diária grátis (slot 0). */
export const FREE_DAILY_REWARDS: Record<
  DailyRewardRarity,
  { xp: [number, number]; abdoria: [number, number] }
> = {
  comum: { xp: [1, 1], abdoria: [1, 1] },
  incomum: { xp: [2, 2], abdoria: [2, 2] },
  raro: { xp: [2, 3], abdoria: [2, 3] },
  epico: { xp: [3, 3], abdoria: [3, 3] },
};

/**
 * Ofertas pagas — taxas da loja:
 * - Comprar XP: paga Dorias (5 Dorias = 1 XP)
 * - Comprar Dorias: paga XP do progresso do nível (25 XP = 1 Doria)
 */
export const PAID_OFFER_CONFIG: Record<
  DailyShopPaidOfferKind,
  Record<
    DailyRewardRarity,
    {
      xp?: number;
      abdoria?: number;
      bonus_xp?: number;
      bonus_abdoria?: number;
    }
  >
> = {
  surto_xp: {
    comum: { xp: 1 },
    incomum: { xp: 2 },
    raro: { xp: 3 },
    epico: { xp: 4 },
  },
  bolsa_abdoria: {
    comum: { abdoria: 1 },
    incomum: { abdoria: 2 },
    raro: { abdoria: 3 },
    epico: { abdoria: 4 },
  },
  pacote_misto: {
    comum: { bonus_xp: 1, bonus_abdoria: 1 },
    incomum: { bonus_xp: 2, bonus_abdoria: 2 },
    raro: { bonus_xp: 3, bonus_abdoria: 3 },
    epico: { bonus_xp: 4, bonus_abdoria: 4 },
  },
};

export function paidOfferAbdoriaCost(
  offerKind: DailyShopPaidOfferKind,
  raridade: DailyRewardRarity,
): number {
  const config = PAID_OFFER_CONFIG[offerKind][raridade];
  if (offerKind === 'surto_xp') return abdoriaCostForXpReward(config.xp ?? 0);
  if (offerKind === 'pacote_misto') return abdoriaCostForXpReward(config.bonus_xp ?? 0);
  return 0;
}

export function paidOfferXpCost(
  offerKind: DailyShopPaidOfferKind,
  raridade: DailyRewardRarity,
): number {
  const config = PAID_OFFER_CONFIG[offerKind][raridade];
  if (offerKind === 'bolsa_abdoria') return xpCostForAbdoriaReward(config.abdoria ?? 0);
  if (offerKind === 'pacote_misto') return xpCostForAbdoriaReward(config.bonus_abdoria ?? 0);
  return 0;
}

export function inferPaidOfferKind(slot: Pick<LojaDiariaSlot, 'kind' | 'recompensa_tipo'>): DailyShopPaidOfferKind | null {
  if (slot.kind !== 'oferta') return null;
  if (slot.recompensa_tipo === 'xp') return 'surto_xp';
  if (slot.recompensa_tipo === 'abdoria') return 'bolsa_abdoria';
  if (slot.recompensa_tipo === 'pacote') return 'pacote_misto';
  return null;
}

export function expectedDailyOfferCosts(
  slot: Pick<LojaDiariaSlot, 'kind' | 'recompensa_tipo' | 'raridade'>,
): { preco_abdoria: number; preco_xp: number } {
  const offerKind = inferPaidOfferKind(slot);
  if (!offerKind) return { preco_abdoria: 0, preco_xp: 0 };
  return {
    preco_abdoria: paidOfferAbdoriaCost(offerKind, slot.raridade),
    preco_xp: paidOfferXpCost(offerKind, slot.raridade),
  };
}

export function isStaleDailyOffer(slot: LojaDiariaSlot): boolean {
  if (slot.kind !== 'oferta') return false;

  const expected = expectedDailyOfferCosts(slot);
  const abdoriaCost = slot.preco_abdoria ?? 0;
  const xpCost = slot.preco_xp ?? 0;

  if (slot.recompensa_tipo === 'abdoria' && xpCost <= 0) return true;
  if (slot.recompensa_tipo === 'xp' && abdoriaCost <= 0) return true;
  if (slot.recompensa_tipo === 'pacote' && (xpCost <= 0 || abdoriaCost <= 0)) return true;
  if (slot.recompensa_tipo === 'xp' && slot.valor > 0 && abdoriaCost < slot.valor * 5) return true;
  if (abdoriaCost !== expected.preco_abdoria || xpCost !== expected.preco_xp) return true;

  return false;
}

export const PAID_OFFER_KINDS: DailyShopPaidOfferKind[] = [
  'surto_xp',
  'bolsa_abdoria',
  'pacote_misto',
];

export function hashDailySeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickDailyRarity(date: string, slot: number): DailyRewardRarity {
  const roll = hashDailySeed(`${date}:${slot}`) % 100;
  let acc = 0;
  for (const [raridade, weight] of Object.entries(DAILY_RARITY_WEIGHTS) as [DailyRewardRarity, number][]) {
    acc += weight;
    if (roll < acc) return raridade;
  }
  return 'comum';
}

export function pickFreeDailyRewardType(date: string, slot: number): Exclude<DailyRewardType, 'pacote'> {
  return hashDailySeed(`${date}:${slot}:tipo`) % 2 === 0 ? 'xp' : 'abdoria';
}

export function pickDailyValue(
  date: string,
  slot: number,
  tipo: Exclude<DailyRewardType, 'pacote' | 'item'>,
  raridade: DailyRewardRarity,
  kind: DailyShopSlotKind,
): number {
  const table = kind === 'recompensa_diaria' ? FREE_DAILY_REWARDS : null;
  if (!table) return 0;

  const range = table[raridade][tipo];
  if (range[0] === range[1]) return range[0];
  const span = range[1] - range[0] + 1;
  return range[0] + (hashDailySeed(`${date}:${slot}:${tipo}:${raridade}`) % span);
}

export function pickPaidOfferKind(date: string, slot: number): DailyShopPaidOfferKind {
  const index = hashDailySeed(`${date}:paid:${slot}`) % PAID_OFFER_KINDS.length;
  return PAID_OFFER_KINDS[index] ?? 'pacote_misto';
}

export function pickDistinctPaidOfferKinds(date: string): [DailyShopPaidOfferKind, DailyShopPaidOfferKind] {
  const first = pickPaidOfferKind(date, 1);
  const candidates = PAID_OFFER_KINDS.filter((kind) => kind !== first);
  const second = candidates[hashDailySeed(`${date}:paid:2`) % candidates.length] ?? 'bolsa_abdoria';
  return [first, second];
}
