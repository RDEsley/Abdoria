import type { CosmeticDefinition } from '../types/index.js';
import { isShopHiddenCosmetic } from '../types/index.js';

/** Cosméticos que nunca dropam na Exploração. */
export const AFK_EXPLORATION_DROP_EXCLUDED_COSMETIC_IDS = ['titulo_dono_do_jogo'] as const;

/** Roll exato na tabela de loot (0,01% quando há proc) — título Secret. */
export const AFK_SECRET_ROLL_EXACT = 9999;

/** Roll exato para armas Secret (com portão extra — taxa menor que o título). */
export const AFK_SECRET_WEAPON_ROLL_EXACT = 9998;

/** Portão secundário: roll 9998 + hash % N === 0 → ~0,0033% vs 0,01% do título. */
export const AFK_SECRET_WEAPON_GATE_MOD = 3;

/** ~5 Route Drinks em 24h (11.520 kills): roll % 10.000 < 4 ≈ 4,6 un. */
export const AFK_ROUTE_DRINK_DROP_THRESHOLD = 4;

export function isExplorationLegendaryCosmeticDrop(
  item: Pick<CosmeticDefinition, 'id' | 'kind' | 'raridade' | 'unlock'>,
): boolean {
  if (item.kind === 'som') return false;
  if ((AFK_EXPLORATION_DROP_EXCLUDED_COSMETIC_IDS as readonly string[]).includes(item.id)) {
    return false;
  }
  if (isShopHiddenCosmetic(item.id)) return false;
  if (item.unlock.tipo !== 'moedas') return false;
  return item.raridade === 'lendario' || item.raridade === 'epico';
}

export type ExplorationDropCosmetic = Pick<
  CosmeticDefinition,
  'id' | 'kind' | 'raridade' | 'unlock'
> & { nome?: string };
