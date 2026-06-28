import { Flame, Snowflake } from 'lucide-react';

interface Props {
  streak: number;
  frozen?: boolean;
}

export function StreakBadge({ streak, frozen = false }: Props) {
  const tier = frozen
    ? 'frozen'
    : streak >= 30 ? 'hot' : streak >= 7 ? 'warm' : streak >= 3 ? 'cool' : streak > 0 ? 'active' : 'none';

  return (
    <span className={`game-streak game-streak--${tier}`}>
      {frozen ? (
        <Snowflake size={14} className="game-streak__snowflake" aria-hidden />
      ) : (
        <Flame size={14} className={streak > 0 ? 'game-streak__flame--on' : undefined} />
      )}
      {frozen ? 'Congelado' : `Streak · ${streak}d`}
    </span>
  );
}
