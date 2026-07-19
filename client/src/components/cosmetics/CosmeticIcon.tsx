import type { AchievementIcon, CosmeticRarity } from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';

interface Props {
  icon: AchievementIcon;
  size?: number;
  unlocked?: boolean;
  /** Quando informada, troca pro selo com moldura por raridade (Personalização). */
  raridade?: CosmeticRarity;
}

const RARITY_CLASS: Record<CosmeticRarity, string> = {
  comum: 'cosmetic-icon--comum',
  raro: 'cosmetic-icon--raro',
  epico: 'cosmetic-icon--epico',
  lendario: 'cosmetic-icon--lendario',
  mitico: 'cosmetic-icon--mitico',
  secreto: 'cosmetic-icon--secreto',
};

/**
 * Ícone de cosmético (títulos e efeitos). Sem `raridade`, mantém o selo
 * genérico de conquista (usado nas telas de recompensa). Com `raridade`,
 * renderiza o selo dedicado da Personalização — moldura com gradiente e
 * brilho por raridade, no lugar do ícone de conquista aninhado.
 */
export function CosmeticIcon({ icon, size = 18, unlocked = true, raridade }: Props) {
  if (!raridade) {
    return <AchievementBadge icon={icon} unlocked={unlocked} size={size} />;
  }

  const Icon = ACHIEVEMENT_ICON_COMPONENTS[icon] ?? ACHIEVEMENT_ICON_COMPONENTS.star;

  return (
    <span
      className={`cosmetic-icon ${RARITY_CLASS[raridade]}${unlocked ? '' : ' cosmetic-icon--locked'}`}
    >
      <span className="cosmetic-icon__sheen" aria-hidden />
      <Icon size={size} strokeWidth={2.25} className="cosmetic-icon__glyph" />
    </span>
  );
}
