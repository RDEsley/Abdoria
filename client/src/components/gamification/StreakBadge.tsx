import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  const tier = streak >= 30 ? 'hot' : streak >= 7 ? 'warm' : streak >= 3 ? 'cool' : 'none';

  return (
    <span className={`game-streak game-streak--${tier}`}>
      <Flame size={14} />
      Streak · {streak}d
    </span>
  );
}
