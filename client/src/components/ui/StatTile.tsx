import type { CSSProperties, ReactNode } from 'react';

export type StatTileTone = 'treino' | 'rotina' | 'streak' | 'xp' | 'xp-deep' | 'conquista';
export type StatTileAmbient = 'streak' | 'tempo';

interface Props {
  title: ReactNode;
  value: ReactNode;
  label?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Colour tone — maps to `.game-stat--tone-{tone}` in surfaces.css. */
  tone?: StatTileTone;
  /**
   * Camada decorativa ambiente (opcional) — orbes muito sutis em CSS puro
   * (transform/opacity, sem canvas nem rAF). `streak` sobe brasas âmbar
   * devagar; `tempo` flutua anéis ciano com um movimento diferente. Some
   * sozinha com `prefers-reduced-motion`.
   */
  ambient?: StatTileAmbient;
  /** Presente = o tile vira um botão (ex.: recorde de streak, clicável). */
  onClick?: () => void;
}

/** Extrai o comprimento visível do valor (só quando é texto/número simples). */
function valueLength(value: ReactNode): number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).length;
  }
  return null;
}

/**
 * Tile de estatística — reaproveita `.game-stat*` já definidos em
 * styles/gamification.css. `--val-len` alimenta o `clamp()` do valor: quanto
 * mais caracteres (ex.: "128h 45min" vs "5d"), menor a fonte — sem isso,
 * números longos quebravam linha dentro do tile em telas estreitas.
 */
export function StatTile({
  title,
  value,
  label,
  hint,
  icon,
  className = '',
  tone,
  ambient,
  onClick,
}: Props) {
  const len = valueLength(value);
  const toneClass = tone ? `game-stat--tone-${tone}` : '';
  const style = len != null ? ({ '--val-len': len } as CSSProperties) : undefined;

  const content = (
    <>
      {ambient && (
        <span className={`game-stat__ambient game-stat__ambient--${ambient}`} aria-hidden="true">
          <span className="game-stat__ambient-orb" />
          <span className="game-stat__ambient-orb" />
          <span className="game-stat__ambient-orb" />
        </span>
      )}
      <div className="game-stat__head">
        {icon}
        <span className="game-stat__title">{title}</span>
      </div>
      {label && <p className="game-stat__label">{label}</p>}
      <p className="game-stat__value" style={style}>
        {value}
      </p>
      {hint && <p className="game-stat__hint">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`game-stat game-stat--clickable ${toneClass} ${className}`.trim()}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={`game-stat ${toneClass} ${className}`.trim()}>{content}</div>;
}
