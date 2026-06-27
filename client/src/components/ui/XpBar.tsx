interface Props {
  value: number;
  max: number;
  label?: string;
  hint?: string;
  variant?: 'xp' | 'daily' | 'extra' | 'hp';
  showValues?: boolean;
  /** Exibe só "+N" (XP extra, sem teto). */
  valueOnly?: boolean;
  /** Balanço leve a cada 5s quando value >= max. */
  pulseWhenFull?: boolean;
}

export function XpBar({
  value,
  max,
  label,
  hint,
  variant = 'xp',
  showValues = true,
  valueOnly = false,
  pulseWhenFull = false,
}: Props) {
  const isFull = !valueOnly && max > 0 && value >= max;
  const visualMax = valueOnly ? Math.max(value, 30) : max;
  const pct = visualMax > 0 ? Math.min(100, (value / visualMax) * 100) : 0;
  const wrapClass = [
    'game-xp-bar-wrap',
    pulseWhenFull && isFull ? 'game-xp-bar-wrap--full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      {(label || showValues) && (
        <div className="game-xp-bar__meta">
          {label && <span className="game-xp-bar__label">{label}</span>}
          {showValues && (
            <span className="game-xp-bar__values">
              {valueOnly ? `+${value}` : `${value}/${max}`}
            </span>
          )}
        </div>
      )}
      {hint && <p className="game-xp-bar__hint">{hint}</p>}
      <div
        className={[
          `game-xp-bar game-xp-bar--${variant}`,
          isFull ? 'game-xp-bar--capped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={valueOnly ? visualMax : max}
      >
        <div className="game-xp-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
