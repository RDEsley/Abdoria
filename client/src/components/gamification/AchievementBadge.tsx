import type { AchievementIcon } from '@/types';
import {
  Calendar,
  Clock,
  Crown,
  Dumbbell,
  Flame,
  Gem,
  Heart,
  Medal,
  Moon,
  Rocket,
  Shield,
  Star,
  Sun,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const ICONS: Record<AchievementIcon, typeof Medal> = {
  medal: Medal,
  flame: Flame,
  trophy: Trophy,
  zap: Zap,
  star: Star,
  target: Target,
  crown: Crown,
  sun: Sun,
  moon: Moon,
  calendar: Calendar,
  clock: Clock,
  gem: Gem,
  rocket: Rocket,
  dumbbell: Dumbbell,
  heart: Heart,
  shield: Shield,
};

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
};

interface Props {
  icon: AchievementIcon;
  unlocked?: boolean;
  size?: number;
}

export function AchievementBadge({ icon, unlocked = false, size = 18 }: Props) {
  const Icon = ICONS[icon] ?? Medal;
  const tone = unlocked ? (ICON_TONE[icon] ?? 'text-emerald-600') : 'text-stone-300';

  return (
    <span className={`game-achievement__icon ${unlocked ? 'game-achievement__icon--lit' : ''}`}>
      <Icon size={size} className={tone} strokeWidth={2.5} />
    </span>
  );
}
