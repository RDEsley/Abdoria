import { Clock3, Sparkles } from 'lucide-react';
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
  paused?: boolean;
  dropChances?: AfkKillDropChances;
}

export function AfkTimerPanel({
  minutos,
  elapsedSinceSyncMin,
  capped,
  loading,
  paused = false,
  dropChances,
}: Props) {
  const display = afkDisplayMinutes(minutos, capped ? 0 : elapsedSinceSyncMin);
  const progress = capped ? 1 : afkProgressToCap(minutos, elapsedSinceSyncMin);
  const chances = dropChances ?? AFK_KILL_DROP_CHANCES;

  return (
    <div className={`game-afk-timer${capped ? ' game-afk-timer--capped' : ''}`} aria-live="polite">
      <div className="game-afk-timer__row">
        <span className="game-afk-timer__label">
          <Clock3 size={14} aria-hidden />
          Tempo de patrulha
        </span>
        <span className="game-afk-timer__status">
          {paused ? 'Pausado' : capped ? 'Baú cheio' : 'Em andamento'}
        </span>
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
        aria-label={`Progresso até o limite de ${AFK_MAX_MINUTES / 60}h de exploração`}
      >
        <div
          className="game-afk-timer__bar-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {!capped && !loading && (
        <div className="game-afk-timer__loot-rates">
          <Sparkles size={12} aria-hidden />
          <span>{chances.common}% comum</span>
          <span>{chances.elite}% elite</span>
          <span>{chances.boss}% boss</span>
        </div>
      )}
      {capped && (
        <span className="game-afk-timer__label game-afk-timer__capped-hint">
          Limite atingido — colete pra continuar explorando!
        </span>
      )}
    </div>
  );
}
