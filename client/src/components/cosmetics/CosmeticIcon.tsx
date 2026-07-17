import type { AchievementIcon } from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';

interface Props {
  icon: AchievementIcon;
  size?: number;
  unlocked?: boolean;
}

export function CosmeticIcon({ icon, size = 18, unlocked = true }: Props) {
  return <AchievementBadge icon={icon} unlocked={unlocked} size={size} />;
}
