import type { CosmeticRarity } from '../types/index.js';

export type RewardPresentationKind =
  | 'xp'
  | 'abdoria'
  | 'drink'
  | 'route_drink'
  | 'exp_instant'
  | 'doria_bag'
  | 'cosmetic'
  | 'weapon'
  | 'secret_title';

export interface RewardPresentationItem {
  id: string;
  kind: RewardPresentationKind;
  rarity: CosmeticRarity | 'comum';
  name: string;
  description?: string;
  amount?: number;
  cosmeticId?: string;
  icon?: string;
  /** Exibir na fase 1 (revelação secreta, um por vez). */
  secretReveal?: boolean;
  /** Variante dourada da animação secreta (Golden Slime). */
  goldenSecret?: boolean;
}

export function isSecretRevealItem(item: RewardPresentationItem): boolean {
  return Boolean(item.secretReveal || item.rarity === 'secreto');
}
