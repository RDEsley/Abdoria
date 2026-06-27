import {
  afkDisplayMinutes,
  afkProgressToCap,
  formatAfkTimer,
  AFK_KILL_DROP_CHANCES,
  AFK_MAX_MINUTES,
  type AfkKillDropChances,
} from '@shared/utils/afk';

interface Props {
  minutos: number;
  elapsedSinceSyncMin: number;
  capped: boolean;
  loading?: boolean;
  dropChances?: AfkKillDropChances;
}

export function AfkTimerPanel({ minutos, elapsedSinceSyncMin, capped, loading, dropChances }: Props) {
  const display = afkDisplayMinutes(minutos, capped ? 0 : elapsedSinceSyncMin);
  const progress = capped ? 1 : afkProgressToCap(minutos, elapsedSinceSyncMin);
  const chances = dropChances ?? AFK_KILL_DROP_CHANCES;

  return (
    <div className="game-afk-timer" aria-live="polite">
      <div className="game-afk-timer__row">
        <span className="game-afk-timer__label">Tempo acumulado</span>
        {!capped && !loading && (
          <span className="game-afk-timer__next">
            Loot: {chances.common}% comum · {chances.elite}% elite · {chances.boss}% boss
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
        aria-label="Progresso até o limite de 24h de exploração"
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
