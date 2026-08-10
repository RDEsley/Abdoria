import type React from 'react';
import {
  Bomb,
  CircleDot,
  Coins,
  Droplets,
  Flame,
  Mountain,
  Radiation,
  Snowflake,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { PatrolBowIcon, PatrolSwordIcon } from '@/components/afk/patrol-shop/PatrolWeaponIcons';
import { FrozenStreakIcon, RouteDrinkIcon, ExpInstantIcon, DoriaBagIcon } from '@/lib/item-icons';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import {
  CURRENCY_NAME,
  EXP_INSTANT_LABEL,
  DORIA_BAG_LABEL,
  FROZEN_STREAK_LABEL,
  PATROL_WEAPON_BY_ID,
  isGoldenSlimeSecretCosmetic,
  SLIME_MATERIAL_BY_ID,
  isSlimeMaterialItemId,
  type AchievementIcon,
  type AfkPendingReward,
} from '@/types';
import { countAfkDropEvents } from '@shared/utils/afk';

export type AfkRewardKind =
  | 'xp'
  | 'abdoria'
  | 'frozen_streak'
  | 'route_drink'
  | 'exp_instant'
  | 'doria_bag'
  | 'material'
  | 'cosmetic'
  | 'secret'
  | 'weapon';

export type AfkRewardRarity =
  'comum' | 'raro' | 'epico' | 'lendario' | 'mitico' | 'secret' | 'golden_secret';

export const AFK_RARITY_LABEL: Record<AfkRewardRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
  mitico: 'Mítico',
  secret: 'Secret',
  golden_secret: 'Secret Dourado',
};

const AFK_RARITY_ORDER: Record<AfkRewardRarity, number> = {
  comum: 0,
  raro: 1,
  epico: 2,
  lendario: 3,
  mitico: 4,
  secret: 5,
  golden_secret: 6,
};

export interface AfkRewardItem {
  key: string;
  kind: AfkRewardKind;
  amount?: number;
  cosmeticId?: string;
  materialId?: string;
  cosmeticIcon?: AchievementIcon;
  secret?: boolean;
  rarity?: AfkRewardRarity;
  description?: string;
  ariaLabel: string;
}

function rarityForItem(item: AfkRewardItem): AfkRewardRarity {
  // Secret exclusivo do Golden Slime → moldura branca e dourada.
  if (item.kind === 'cosmetic' && item.cosmeticId && isGoldenSlimeSecretCosmetic(item.cosmeticId)) {
    return 'golden_secret';
  }
  if (item.secret || item.kind === 'secret') return 'secret';
  if (item.kind === 'material' && item.materialId && isSlimeMaterialItemId(item.materialId)) {
    const tier = SLIME_MATERIAL_BY_ID[item.materialId].tier;
    return tier === 'boss' ? 'epico' : tier === 'elite' ? 'raro' : 'comum';
  }
  if (item.kind === 'weapon' && item.cosmeticId) {
    const r = PATROL_WEAPON_BY_ID[item.cosmeticId]?.raridade;
    if (r === 'secreto') return 'secret';
    if (r === 'mitico') return 'mitico';
    if (r === 'lendario') return 'lendario';
    if (r === 'epico') return 'epico';
    if (r === 'raro') return 'raro';
    return 'comum';
  }
  // Cosméticos só dropam na Exploração quando são épicos/lendários.
  if (item.kind === 'cosmetic') return 'lendario';
  // Frozen Streak subiu pra Épico (2026-07-21) — reflete a raridade real do drop.
  if (item.kind === 'frozen_streak') return 'epico';
  if (item.kind === 'route_drink') return 'raro';
  return 'comum';
}

function descriptionForItem(item: AfkRewardItem): string {
  switch (item.kind) {
    case 'xp':
      return 'Experiência ganha enquanto sua patrulha avança sozinha.';
    case 'abdoria':
      return `Moedas ${CURRENCY_NAME} para gastar na loja do jogo.`;
    case 'route_drink':
      return 'Bebida de rota coletada na exploração.';
    case 'frozen_streak':
      return 'Protege sua ofensiva caso você perca um dia de treino.';
    case 'exp_instant':
      return 'Concede XP instantâneo ao ser utilizado.';
    case 'doria_bag':
      return 'Saco com moedas extras de Abdoria.';
    case 'material': {
      if (!item.materialId || !isSlimeMaterialItemId(item.materialId)) return 'Material de slime.';
      const material = SLIME_MATERIAL_BY_ID[item.materialId];
      return `${material.description} Pode ser vendido por ${material.sellPrice} Coins.`;
    }
    case 'weapon': {
      const w = item.cosmeticId ? PATROL_WEAPON_BY_ID[item.cosmeticId] : undefined;
      if (!w) return 'Arma rara dropada na exploração.';
      if (w.kind === 'magia') return `${w.descricao} Dano: ${w.dano_base}.`;
      const dano = w.nivel === 10 ? 'dano especial' : `dano ${w.dano_base}`;
      return `${w.descricao} (${dano}).`;
    }
    case 'cosmetic':
      return 'Cosmético raro encontrado na exploração.';
    case 'secret':
      return 'Recompensa secreta raríssima — pouquíssimos exploradores a viram.';
    default:
      return '';
  }
}

function withMeta(item: AfkRewardItem): AfkRewardItem {
  return { ...item, rarity: rarityForItem(item), description: descriptionForItem(item) };
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
  if ((pending.frozen_streaks ?? 0) > 0) {
    items.push({
      key: 'frozen_streak',
      kind: 'frozen_streak',
      amount: pending.frozen_streaks,
      ariaLabel: `${pending.frozen_streaks} ${FROZEN_STREAK_LABEL}${pending.frozen_streaks === 1 ? '' : 's'}`,
    });
  }
  if ((pending.exp_instant ?? 0) > 0) {
    items.push({
      key: 'exp_instant',
      kind: 'exp_instant',
      amount: pending.exp_instant,
      ariaLabel: `${pending.exp_instant} ${EXP_INSTANT_LABEL}`,
    });
  }
  if ((pending.doria_bags ?? 0) > 0) {
    items.push({
      key: 'doria_bag',
      kind: 'doria_bag',
      amount: pending.doria_bags,
      ariaLabel: `${pending.doria_bags} ${DORIA_BAG_LABEL}`,
    });
  }
  Object.entries(pending.material_items ?? {}).forEach(([materialId, amount]) => {
    if (!isSlimeMaterialItemId(materialId) || !amount || amount < 1) return;
    const material = SLIME_MATERIAL_BY_ID[materialId];
    items.push({
      key: materialId,
      kind: 'material',
      materialId,
      amount,
      ariaLabel: `${amount} ${material.name}`,
    });
  });
  (pending.cosmetic_ids ?? []).forEach((id) => {
    const meta = COSMETIC_BY_ID[id];
    const icon = (meta?.icon ?? 'star') as AchievementIcon;
    items.push({
      key: id,
      kind: 'cosmetic',
      cosmeticId: id,
      cosmeticIcon: icon,
      ariaLabel: meta?.nome ?? id,
    });
  });
  (pending.weapon_ids ?? []).forEach((id) => {
    const weapon = PATROL_WEAPON_BY_ID[id];
    items.push({
      key: id,
      kind: 'weapon',
      cosmeticId: id,
      ariaLabel: weapon?.nome ?? id,
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

  // Raridade crescente: comuns primeiro, tiers maiores por último (mais à direita).
  return items
    .map(withMeta)
    .sort((a, b) => AFK_RARITY_ORDER[a.rarity ?? 'comum'] - AFK_RARITY_ORDER[b.rarity ?? 'comum']);
}

export function countAfkRewardItems(pending: AfkPendingReward | null | undefined): number {
  return buildAfkRewardItems(pending).length;
}

export { countAfkDropEvents };

export function AfkRewardIcon({ item, size = 22 }: { item: AfkRewardItem; size?: number }) {
  if (item.kind === 'xp') return <Zap size={size} aria-hidden />;
  if (item.kind === 'abdoria') return <Coins size={size} aria-hidden />;
  if (item.kind === 'frozen_streak') return <FrozenStreakIcon size={size} />;
  if (item.kind === 'route_drink') return <RouteDrinkIcon size={size} />;
  if (item.kind === 'exp_instant') return <ExpInstantIcon size={size} />;
  if (item.kind === 'doria_bag') return <DoriaBagIcon size={size} />;
  if (item.kind === 'material' && item.materialId && isSlimeMaterialItemId(item.materialId)) {
    return (
      <span className="game-afk-material-icon" style={{ fontSize: `${size}px` }} aria-hidden>
        {SLIME_MATERIAL_BY_ID[item.materialId].icon}
      </span>
    );
  }
  if (item.kind === 'weapon' && item.cosmeticId) {
    if (item.cosmeticId.startsWith('magia_')) {
      const spellIcons: Record<string, React.ElementType> = {
        magia_agua: Droplets,
        magia_terra: Mountain,
        magia_gelo: Snowflake,
        magia_fogo: Flame,
        magia_relampago: Zap,
        magia_buraco_negro: CircleDot,
        magia_raio_laser: Radiation,
        magia_explosao: Bomb,
      };
      const SpellIcon = spellIcons[item.cosmeticId] ?? Sparkles;
      return <SpellIcon size={size} aria-hidden />;
    }
    const kind = item.cosmeticId.startsWith('arco_') ? 'arco' : 'espada';
    const Icon = kind === 'arco' ? PatrolBowIcon : PatrolSwordIcon;
    return (
      <Icon
        className="inline-block"
        variant={item.cosmeticId}
        style={{ width: size, height: size }}
      />
    );
  }
  if (item.cosmeticIcon) {
    return <CosmeticIcon icon={item.cosmeticIcon} size={size} />;
  }
  return <Sparkles size={size} aria-hidden />;
}
