import { useEffect, useState } from 'react';
import { Snowflake, TimerReset } from 'lucide-react';
import { formatCountdown, secondsUntilSaoPauloMidnight } from '@shared/utils/timezone';

/** Só nas últimas 5h do dia (horário de SP) o contador aparece. */
const WINDOW_SECONDS = 5 * 3600;

/** Nos últimos 59min (mesmo limiar em que `formatCountdown` passa a mostrar segundos). */
const URGENT_SECONDS = 3600;

interface Props {
  treinoHoje: boolean;
  streak: number;
  frozenCount: number;
}

/**
 * Contador ao lado da streak na Home: vermelho e pulsando quando não há
 * Frozen Streak no inventário (a sequência vai zerar), azul-informativo
 * quando há — o item será consumido automaticamente se o dia acabar sem treino.
 * Nos últimos 59min, o número fica vermelho independente do estado (urgência
 * visual crescente conforme o prazo aperta).
 */
export function StreakCountdown({ treinoHoje, streak, frozenCount }: Props) {
  const [seconds, setSeconds] = useState(() => secondsUntilSaoPauloMidnight());

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntilSaoPauloMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (treinoHoje || streak <= 0 || seconds > WINDOW_SECONDS) return null;

  const danger = frozenCount <= 0;
  const urgente = seconds < URGENT_SECONDS;

  return (
    <span
      className={`streak-countdown ${danger ? 'streak-countdown--danger' : 'streak-countdown--frozen'}`}
      role="status"
      aria-live="polite"
    >
      {danger ? <TimerReset size={13} aria-hidden /> : <Snowflake size={13} aria-hidden />}
      {danger ? (
        <>
          <strong
            className={`streak-countdown__time tabular-nums${urgente ? ' streak-countdown__time--urgent' : ''}`}
          >
            {formatCountdown(seconds)}
          </strong>
          <span className="streak-countdown__hint">pra manter a sequência</span>
        </>
      ) : (
        <span className="streak-countdown__hint">
          Frozen Streak será ativado em:{' '}
          <strong
            className={`streak-countdown__time tabular-nums${urgente ? ' streak-countdown__time--urgent' : ''}`}
          >
            {formatCountdown(seconds)}
          </strong>
        </span>
      )}
    </span>
  );
}
