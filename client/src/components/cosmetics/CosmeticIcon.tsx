import { AvatarPortrait } from '@/components/cosmetics/AvatarPortrait';
import type { CosmeticAvatarIcon } from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';

interface Props {
  icon: CosmeticAvatarIcon;
  avatarId?: string;
  letter?: string;
  size?: number;
  unlocked?: boolean;
}

export function CosmeticIcon({ icon, avatarId, letter, size = 18, unlocked = true }: Props) {
  if (avatarId) {
    return (
      <AvatarPortrait
        avatarId={avatarId}
        letter={letter}
        unlocked={unlocked}
        className="game-avatar-portrait--thumb"
      />
    );
  }

  if (icon === 'letter') {
    return (
      <span className="game-avatar-initial-letter" aria-hidden>
        {letter?.[0]?.toUpperCase() ?? '?'}
      </span>
    );
  }

  return <AchievementBadge icon={icon} unlocked={unlocked} size={size} />;
}
