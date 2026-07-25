import type { AchievementIcon } from '@/types';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';

interface Props {
  icon: AchievementIcon;
  unlocked?: boolean;
  size?: number;
}

/** Selo de ícone único (mesmo glifo por conquista, sem arco-íris por tipo):
    dourado quando desbloqueada, cinza neutro quando bloqueada — o estado é
    o que importa, não a categoria do ícone. */
export function AchievementBadge({ icon, unlocked = false, size = 18 }: Props) {
  const Icon = ACHIEVEMENT_ICON_COMPONENTS[icon] ?? ACHIEVEMENT_ICON_COMPONENTS.medal;

  return (
    <span className={`game-achievement__icon ${unlocked ? 'game-achievement__icon--lit' : ''}`}>
      <Icon size={size} stroke={2.25} />
    </span>
  );
}
