import type { AfkPendingReward } from '@/types';
import type { RewardPresentationItem } from '@shared/rewards/presentation';
import { COSMETIC_DISPLAY } from '@/lib/cosmetics-meta';

export type DevSecretPreviewVariant = 'title' | 'golden' | 'weapon' | 'all';

const tituloSecreto = COSMETIC_DISPLAY.titulo_secreto;

export function buildDevSecretPreviewItem(variant: DevSecretPreviewVariant): RewardPresentationItem[] {
  switch (variant) {
    case 'golden':
      return [
        {
          id: 'borda_aurum_slime',
          kind: 'cosmetic',
          rarity: 'secreto',
          name: 'Aurum Slime',
          description: 'Borda exclusiva do Golden Slime.',
          cosmeticId: 'borda_aurum_slime',
          icon: 'gem',
          secretReveal: true,
          goldenSecret: true,
        },
      ];
    case 'weapon':
      return [
        {
          id: 'espada_10',
          kind: 'weapon',
          rarity: 'secreto',
          name: 'Espada Secreta',
          description: 'Arma nv. 10 — preview de animação.',
          cosmeticId: 'espada_10',
          secretReveal: true,
        },
      ];
    case 'all':
      return [
        ...buildDevSecretPreviewItem('title'),
        ...buildDevSecretPreviewItem('golden'),
        ...buildDevSecretPreviewItem('weapon'),
      ];
    case 'title':
    default:
      return [
        {
          id: 'titulo_secreto',
          kind: 'secret_title',
          rarity: 'secreto',
          name: tituloSecreto?.nome ?? 'Secret',
          description: tituloSecreto?.descricao,
          cosmeticId: 'titulo_secreto',
          icon: tituloSecreto?.icon ?? 'moon',
          secretReveal: true,
          goldenSecret: false,
        },
      ];
  }
}

/** Mock de 1h de Route Drink com itens comuns + um secreto para testar o fluxo completo. */
export function buildDevRouteDrinkClaim(): AfkPendingReward {
  return {
    xp: 14,
    abdoria: 6,
    frozen_streaks: 1,
    route_drinks: 0,
    exp_instant: 0,
    doria_bags: 1,
    cosmetic_ids: [],
    weapon_ids: [],
    titulo_secreto: true,
    drop_count: 4,
  };
}

export const DEV_REWARD_PREVIEW_EVENT = 'abdoria:dev-celebration';

export function dispatchDevRouteDrinkCelebration(claimed = buildDevRouteDrinkClaim()): void {
  window.dispatchEvent(new CustomEvent(DEV_REWARD_PREVIEW_EVENT, { detail: claimed }));
}

declare global {
  interface Window {
    /** Dev only — preview animação de item secret. Variantes: title, golden, weapon, all */
    __abdoriaPreviewSecret?: (variant?: DevSecretPreviewVariant) => void;
    /** Dev only — preview baú + secrets como após Route Drink */
    __abdoriaPreviewRouteDrink?: () => void;
  }
}
