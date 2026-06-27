interface Props {
  open?: boolean;
  opening?: boolean;
  shaking?: boolean;
  ready?: boolean;
  empty?: boolean;
  celebrate?: boolean;
  size?: 'sm' | 'lg';
  itemCount?: number;
}

export function AfkPatrolChest({
  open = false,
  opening = false,
  shaking = false,
  ready = false,
  empty = false,
  celebrate = false,
  size = 'sm',
  itemCount = 0,
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
      aria-hidden
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
      {itemCount > 0 && !open && !opening && (
        <span className="game-afk-chest__count-badge tabular-nums" aria-label={`${itemCount} drop${itemCount === 1 ? '' : 's'} de inimigos`}>
          {itemCount}
        </span>
      )}
      <div className="game-afk-chest__lid-wrap">
        <div className="game-afk-chest__lid" />
        <div className="game-afk-chest__lid-rim" />
      </div>
      <div className="game-afk-chest__body">
        <div className="game-afk-chest__band" />
        <div className="game-afk-chest__lock" />
      </div>
    </div>
  );
}
