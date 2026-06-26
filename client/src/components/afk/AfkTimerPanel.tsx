import {
  afkDisplayMinutes,
  afkProgressToCap,
  formatAfkTimer,
  AFK_KILL_DROP_CHANCE,
  AFK_MAX_MINUTES,
} from '@shared/utils/afk';

interface Props {
  minutos: number;
  elapsedSinceSyncMin: number;
  capped: boolean;
  loading?: boolean;
}

export function AfkTimerPanel({ minutos, elapsedSinceSyncMin, capped, loading }: Props) {
  const display = afkDisplayMinutes(minutos, capped ? 0 : elapsedSinceSyncMin);
  const progress = capped ? 1 : afkProgressToCap(minutos, elapsedSinceSyncMin);

  return (
    <div className="game-afk-timer" aria-live="polite">
      <div className="game-afk-timer__row">
        <span className="game-afk-timer__label">Tempo acumulado</span>
        {!capped && !loading && (
          <span className="game-afk-timer__next">
            Loot: {AFK_KILL_DROP_CHANCE}% por kill
          </span>
        )}
      </div>
      <span className="game-afk-timer__value tabular-nums">
        {loading ? '--:--:--' : formatAfkTimer(display)}
      </span>
      <div
        className="game-afk-timer__bar"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso até o limite de 24h de patrulha"
      >
        <div className="game-afk-timer__bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {!capped && (
        <span className="game-afk-timer__label" style={{ textAlign: 'center', marginTop: '0.1rem' }}>
          Cada inimigo derrotado pode dropar loot · máx. {AFK_MAX_MINUTES / 60}h
        </span>
      )}
    </div>
  );
}
