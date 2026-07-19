import { useEffect, useState } from 'react';
import { Snowflake, TimerReset } from 'lucide-react';
import { formatCountdown, secondsUntilSaoPauloMidnight } from '@shared/utils/timezone';

/** Só nas últimas 5h do dia (horário de SP) o contador aparece. */
const WINDOW_SECONDS = 5 * 3600;

interface Props {
  treinoHoje: boolean;
  streak: number;
  frozenCount: number;
}

/**
 * Contador ao lado da streak na Home: vermelho e pulsando quando não há
 * Frozen Streak no inventário (a sequência vai zerar), azul-informativo
 * quando há — o item será consumido automaticamente se o dia acabar sem treino.
 */
export function StreakCountdown({ treinoHoje, streak, frozenCount }: Props) {
  const [seconds, setSeconds] = useState(() => secondsUntilSaoPauloMidnight());

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntilSaoPauloMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (treinoHoje || streak <= 0 || seconds > WINDOW_SECONDS) return null;

  const danger = frozenCount <= 0;

  return (
    <span
      className={`streak-countdown ${danger ? 'streak-countdown--danger' : 'streak-countdown--frozen'}`}
      role="status"
      aria-live="polite"
    >
      {danger ? <TimerReset size={13} aria-hidden /> : <Snowflake size={13} aria-hidden />}
      <strong className="streak-countdown__time tabular-nums">{formatCountdown(seconds)}</strong>
      <span className="streak-countdown__hint">
        {danger ? 'pra manter a sequência' : 'Frozen Streak entra se o dia acabar'}
      </span>
    </span>
  );
}
