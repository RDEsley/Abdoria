import type { AfkPendingReward } from '@/types';
import {
  CURRENCY_NAME,
  DORIA_BAG_LABEL,
  EXP_INSTANT_LABEL,
  EXP_INSTANT_XP,
  isGoldenSlimeSecretCosmetic,
  PATROL_WEAPON_BY_ID,
  ROUTE_DRINK_LABEL,
  FROZEN_STREAK_LABEL,
} from '@/types';
import { COSMETIC_DISPLAY } from '@/lib/cosmetics-meta';
import type { RewardPresentationItem } from '@shared/rewards/presentation';

export function buildRewardPresentationFromAfk(pending: AfkPendingReward): RewardPresentationItem[] {
  const items: RewardPresentationItem[] = [];

  if (pending.xp > 0) {
    items.push({
      id: 'xp',
      kind: 'xp',
      rarity: 'comum',
      name: 'Experiência',
      amount: pending.xp,
    });
  }
  if (pending.abdoria > 0) {
    items.push({
      id: 'abdoria',
      kind: 'abdoria',
      rarity: 'comum',
      name: CURRENCY_NAME,
      amount: pending.abdoria,
    });
  }
  if ((pending.frozen_streaks ?? 0) > 0) {
    items.push({
      id: 'frozen_streak',
      kind: 'frozen_streak',
      rarity: 'raro',
      name: FROZEN_STREAK_LABEL,
      amount: pending.frozen_streaks,
    });
  }
  if (pending.route_drinks > 0) {
    items.push({
      id: 'route_drink',
      kind: 'route_drink',
      rarity: 'raro',
      name: ROUTE_DRINK_LABEL,
      amount: pending.route_drinks,
    });
  }
  if (pending.exp_instant > 0) {
    items.push({
      id: 'exp_instant',
      kind: 'exp_instant',
      rarity: 'raro',
      name: EXP_INSTANT_LABEL,
      description: `+${EXP_INSTANT_XP} XP por unidade`,
      amount: pending.exp_instant,
    });
  }
  if (pending.doria_bags > 0) {
    items.push({
      id: 'doria_bag',
      kind: 'doria_bag',
      rarity: 'raro',
      name: DORIA_BAG_LABEL,
      description: '4–21 Dorias ao usar',
      amount: pending.doria_bags,
    });
  }
  (pending.weapon_ids ?? []).forEach((weaponId) => {
    const weapon = PATROL_WEAPON_BY_ID[weaponId];
    items.push({
      id: weaponId,
      kind: 'weapon',
      rarity: weapon?.raridade === 'secreto' ? 'secreto' : weapon?.raridade === 'lendario' ? 'lendario' : 'epico',
      name: weapon?.nome ?? weaponId,
      description: weapon?.descricao,
      cosmeticId: weaponId,
    });
  });
  (pending.cosmetic_ids ?? []).forEach((cosmeticId) => {
    const meta = COSMETIC_DISPLAY[cosmeticId];
    const golden = isGoldenSlimeSecretCosmetic(cosmeticId);
    items.push({
      id: cosmeticId,
      kind: 'cosmetic',
      rarity: meta?.raridade ?? (golden ? 'secreto' : 'lendario'),
      name: meta?.nome ?? cosmeticId,
      description: meta?.descricao,
      cosmeticId,
      icon: meta?.icon,
      secretReveal: golden || meta?.raridade === 'secreto',
      goldenSecret: golden,
    });
  });
  if (pending.titulo_secreto) {
    const meta = COSMETIC_DISPLAY.titulo_secreto;
    items.push({
      id: 'titulo_secreto',
      kind: 'secret_title',
      rarity: 'secreto',
      name: meta?.nome ?? 'Secret',
      description: meta?.descricao,
      cosmeticId: 'titulo_secreto',
      icon: meta?.icon ?? 'moon',
      secretReveal: true,
      goldenSecret: false,
    });
  }

  return items;
}

export function partitionRewardPresentation(items: RewardPresentationItem[]): {
  secrets: RewardPresentationItem[];
  summary: RewardPresentationItem[];
} {
  const secrets = items.filter((item) => item.secretReveal);
  const summary = items.filter((item) => !item.secretReveal);
  return { secrets, summary };
}
