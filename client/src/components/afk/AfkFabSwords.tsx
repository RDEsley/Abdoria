import { Swords } from 'lucide-react';

interface Props {
  variant?: 'fab' | 'header';
}

export function AfkFabSwords({ variant = 'fab' }: Props) {
  const isHeader = variant === 'header';

  return (
    <span
      className={`game-afk-fab-swords${isHeader ? ' game-afk-fab-swords--header' : ''}`}
      aria-hidden
    >
      <Swords
        className="game-afk-fab-swords__icon"
        size={isHeader ? 18 : 16}
        strokeWidth={isHeader ? 2.1 : 2.25}
      />
    </span>
  );
}
