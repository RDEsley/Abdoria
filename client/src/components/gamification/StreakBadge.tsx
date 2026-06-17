import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  const tier = streak >= 30 ? 'hot' : streak >= 7 ? 'warm' : streak >= 3 ? 'cool' : streak > 0 ? 'active' : 'none';

  return (
    <span className={`game-streak game-streak--${tier}`}>
      <Flame size={14} className={streak > 0 ? 'game-streak__flame--on' : undefined} />
      Streak · {streak}d
    </span>
  );
}
