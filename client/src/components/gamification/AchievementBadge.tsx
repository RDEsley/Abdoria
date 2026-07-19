import type { AchievementIcon } from '@/types';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';

const ICONS = ACHIEVEMENT_ICON_COMPONENTS;

const ICON_TONE: Partial<Record<AchievementIcon, string>> = {
  medal: 'text-amber-600',
  flame: 'text-orange-500',
  trophy: 'text-yellow-600',
  zap: 'text-violet-600',
  star: 'text-sky-600',
  target: 'text-rose-600',
  crown: 'text-purple-600',
  sun: 'text-amber-500',
  moon: 'text-indigo-500',
  calendar: 'text-teal-600',
  clock: 'text-cyan-600',
  gem: 'text-fuchsia-600',
  rocket: 'text-blue-600',
  dumbbell: 'text-stone-700',
  heart: 'text-pink-500',
  shield: 'text-emerald-700',
  droplet: 'text-sky-500',
  sparkles: 'text-fuchsia-500',
};

interface Props {
  icon: AchievementIcon;
  unlocked?: boolean;
  size?: number;
}

export function AchievementBadge({ icon, unlocked = false, size = 18 }: Props) {
  const Icon = ICONS[icon] ?? ICONS.medal;
  const tone = unlocked ? (ICON_TONE[icon] ?? 'text-emerald-600') : 'text-stone-300';

  return (
    <span className={`game-achievement__icon ${unlocked ? 'game-achievement__icon--lit' : ''}`}>
      <Icon size={size} className={tone} strokeWidth={2.5} />
    </span>
  );
}
