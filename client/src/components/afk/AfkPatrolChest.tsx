import type { ReactNode } from 'react';

interface Props {
  open?: boolean;
  opening?: boolean;
  shaking?: boolean;
  ready?: boolean;
  empty?: boolean;
  celebrate?: boolean;
  size?: 'sm' | 'lg';
  stock?: ReactNode;
  children?: ReactNode;
}

export function AfkPatrolChest({
  open = false,
  opening = false,
  shaking = false,
  ready = false,
  empty = false,
  celebrate = false,
  size = 'sm',
  stock,
  children,
}: Props) {
  const stateClass = open
    ? 'game-afk-chest--open'
    : opening
      ? 'game-afk-chest--opening'
      : ready
        ? 'game-afk-chest--ready'
        : empty
          ? 'game-afk-chest--empty'
          : '';

  return (
    <div
      className={[
        'game-afk-chest',
        `game-afk-chest--${size}`,
        stateClass,
        celebrate ? 'game-afk-chest--celebrate' : '',
        shaking ? 'game-afk-chest--shaking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={children || stock ? undefined : true}
    >
      {(opening || open) && (
        <>
          <span className="game-afk-chest__spark game-afk-chest__spark--1" />
          <span className="game-afk-chest__spark game-afk-chest__spark--2" />
          <span className="game-afk-chest__spark game-afk-chest__spark--3" />
          <span className="game-afk-chest__spark game-afk-chest__spark--4" />
          <span className="game-afk-chest__spark game-afk-chest__spark--5" />
          <span className="game-afk-chest__burst" aria-hidden />
        </>
      )}
      <div className="game-afk-chest__lid-wrap">
        <div className="game-afk-chest__lid" />
        <div className="game-afk-chest__lid-rim" />
      </div>
      <div className="game-afk-chest__body">
        <div className="game-afk-chest__band" />
        <div className="game-afk-chest__lock" />
        {stock ? <div className="game-afk-chest__stock">{stock}</div> : null}
      </div>
      {children ? <div className="game-afk-chest__loot">{children}</div> : null}
    </div>
  );
}
