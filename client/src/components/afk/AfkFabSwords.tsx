function SwordGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="game-afk-fab-swords__svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 16.5 12.5 3.5" />
      <path d="M3.5 14.5h4.5" />
      <path d="M5.5 14.5v4" />
    </svg>
  );
}

interface Props {
  variant?: 'fab' | 'header';
}

export function AfkFabSwords({ variant = 'fab' }: Props) {
  return (
    <span
      className={`game-afk-fab-swords${variant === 'header' ? ' game-afk-fab-swords--header' : ''}`}
      aria-hidden
    >
      <span className="game-afk-fab-swords__sword game-afk-fab-swords__sword--left">
        <SwordGlyph />
      </span>
      <span className="game-afk-fab-swords__sword game-afk-fab-swords__sword--right">
        <SwordGlyph />
      </span>
    </span>
  );
}
