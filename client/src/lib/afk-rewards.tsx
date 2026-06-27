import { Coins, Sparkles, Zap } from 'lucide-react';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { EnergyDrinkIcon, RouteDrinkIcon } from '@/lib/daily-shop-display';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { CURRENCY_NAME, type AfkPendingReward, type CosmeticAvatarIcon } from '@/types';
import { countAfkDropEvents } from '@shared/utils/afk';

export type AfkRewardKind = 'xp' | 'abdoria' | 'drink' | 'route_drink' | 'cosmetic' | 'secret';

export interface AfkRewardItem {
  key: string;
  kind: AfkRewardKind;
  amount?: number;
  cosmeticId?: string;
  cosmeticIcon?: CosmeticAvatarIcon;
  secret?: boolean;
  ariaLabel: string;
}

export function buildAfkRewardItems(pending: AfkPendingReward | null | undefined): AfkRewardItem[] {
  if (!pending) return [];

  const items: AfkRewardItem[] = [];

  if (pending.xp > 0) {
    items.push({
      key: 'xp',
      kind: 'xp',
      amount: pending.xp,
      ariaLabel: `${pending.xp} pontos de experiência`,
    });
  }
  if (pending.abdoria > 0) {
    items.push({
      key: 'abdoria',
      kind: 'abdoria',
      amount: pending.abdoria,
      ariaLabel: `${pending.abdoria} ${CURRENCY_NAME}`,
    });
  }
  if (pending.route_drinks > 0) {
    items.push({
      key: 'route_drink',
      kind: 'route_drink',
      amount: pending.route_drinks,
      ariaLabel: `${pending.route_drinks} Route Drink${pending.route_drinks === 1 ? '' : 's'}`,
    });
  }
  if (pending.energy_drinks > 0) {
    items.push({
      key: 'drink',
      kind: 'drink',
      amount: pending.energy_drinks,
      ariaLabel: `${pending.energy_drinks} energy drink${pending.energy_drinks === 1 ? '' : 's'}`,
    });
  }
  (pending.cosmetic_ids ?? []).forEach((id) => {
    const meta = COSMETIC_BY_ID[id];
    const icon = (meta?.icon ?? 'star') as CosmeticAvatarIcon;
    items.push({
      key: id,
      kind: 'cosmetic',
      cosmeticId: id,
      cosmeticIcon: icon,
      ariaLabel: meta?.nome ?? id,
    });
  });
  if (pending.titulo_secreto) {
    items.push({
      key: 'titulo_secreto',
      kind: 'secret',
      cosmeticId: 'titulo_secreto',
      cosmeticIcon: 'moon',
      secret: true,
      ariaLabel: COSMETIC_BY_ID.titulo_secreto?.nome ?? 'Título secreto',
    });
  }

  return items;
}

export function countAfkRewardItems(pending: AfkPendingReward | null | undefined): number {
  return buildAfkRewardItems(pending).length;
}

export { countAfkDropEvents };

export function AfkRewardIcon({ item, size = 22 }: { item: AfkRewardItem; size?: number }) {
  if (item.kind === 'xp') return <Zap size={size} aria-hidden />;
  if (item.kind === 'abdoria') return <Coins size={size} aria-hidden />;
  if (item.kind === 'drink') return <EnergyDrinkIcon size={size} />;
  if (item.kind === 'route_drink') return <RouteDrinkIcon size={size} />;
  if (item.cosmeticIcon) {
    return (
      <CosmeticIcon
        icon={item.cosmeticIcon}
        avatarId={item.cosmeticId?.startsWith('avatar_') ? item.cosmeticId : undefined}
        size={size}
      />
    );
  }
  return <Sparkles size={size} aria-hidden />;
}
