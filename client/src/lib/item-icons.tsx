export function FrozenStreakIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-frozen-streak-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="2.5"
          className="game-frozen-streak-icon__cube"
        />
        <path d="M5 12h14M12 5v14" className="game-frozen-streak-icon__facet" strokeWidth="1.4" />
        <path d="M8 8l8 8M16 8l-8 8" className="game-frozen-streak-icon__spark" strokeWidth="1.2" />
      </svg>
    </span>
  );
}
