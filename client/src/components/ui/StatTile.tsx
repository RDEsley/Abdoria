import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  value: ReactNode;
  label?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Tile de estatística — reaproveita `.game-stat*` já definidos em styles/gamification.css. */
export function StatTile({ title, value, label, hint, icon, className = '' }: Props) {
  return (
    <div className={`game-stat ${className}`.trim()}>
      <div className="game-stat__head">
        {icon}
        <span className="game-stat__title">{title}</span>
      </div>
      {label && <p className="game-stat__label">{label}</p>}
      <p className="game-stat__value">{value}</p>
      {hint && <p className="game-stat__hint">{hint}</p>}
    </div>
  );
}
