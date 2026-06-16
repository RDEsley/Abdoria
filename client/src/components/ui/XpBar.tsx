interface Props {
  value: number;
  max: number;
  label?: string;
  variant?: 'xp' | 'daily' | 'hp';
  showValues?: boolean;
}

export function XpBar({ value, max, label, variant = 'xp', showValues = true }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="game-xp-bar-wrap">
      {(label || showValues) && (
        <div className="game-xp-bar__meta">
          {label && <span className="game-xp-bar__label">{label}</span>}
          {showValues && (
            <span className="game-xp-bar__values">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`game-xp-bar game-xp-bar--${variant}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="game-xp-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
