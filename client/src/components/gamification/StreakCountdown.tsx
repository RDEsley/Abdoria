import { Snowflake, TimerReset } from 'lucide-react';
import { useMidnightSecondsLeft } from '@/context/MidnightRefreshContext';
import { formatCountdown } from '@shared/utils/timezone';

/** Só nas últimas 5h do dia (horário de SP) o contador aparece. */
const WINDOW_SECONDS = 5 * 3600;

/** Nos últimos 59min (mesmo limiar em que `formatCountdown` passa a mostrar segundos). */
const URGENT_SECONDS = 3600;

interface Props {
  /** Dia já pago — treino OU Atividade concluída hoje. Nunca use
      `treino_hoje` aqui: ele ignora Atividades, e quem só fez atividades
      seguia vendo "pra manter a sequência" com a sequência já garantida. */
  sequenciaGarantida: boolean;
  streak: number;
  frozenCount: number;
  frozenAutoUse: boolean;
}

/**
 * Contador ao lado da streak na Home: vermelho e pulsando quando não há
 * Frozen Streak no inventário (a sequência vai zerar), azul-informativo
 * quando há — o item será consumido automaticamente se o dia acabar sem treino.
 * Nos últimos 59min, o número fica vermelho independente do estado (urgência
 * visual crescente conforme o prazo aperta).
 */
export function StreakCountdown({ sequenciaGarantida, streak, frozenCount, frozenAutoUse }: Props) {
  const seconds = useMidnightSecondsLeft();

  if (sequenciaGarantida || streak <= 0 || seconds > WINDOW_SECONDS) return null;

  const frozenWillProtect = frozenCount > 0 && frozenAutoUse;
  const autoUseDisabled = frozenCount > 0 && !frozenAutoUse;
  const danger = !frozenWillProtect;
  const urgente = seconds < URGENT_SECONDS;
  const countdown = formatCountdown(seconds);
  const accessibleLabel = frozenWillProtect
    ? `Frozen Streak será ativado em ${countdown}`
    : autoUseDisabled
      ? `Uso automático do Frozen Streak desativado. Treine em até ${countdown} para manter a sequência.`
      : `${countdown} para manter a sequência`;

  return (
    <span
      className={`streak-countdown ${danger ? 'streak-countdown--danger' : 'streak-countdown--frozen'}`}
      role="timer"
      aria-live="off"
      aria-label={accessibleLabel}
    >
      {danger ? <TimerReset size={13} aria-hidden /> : <Snowflake size={13} aria-hidden />}
      {danger ? (
        <>
          <strong
            className={`streak-countdown__time tabular-nums${urgente ? ' streak-countdown__time--urgent' : ''}`}
          >
            {countdown}
          </strong>
          <span className="streak-countdown__hint">
            {autoUseDisabled ? 'pra treinar · automático desligado' : 'pra manter a sequência'}
          </span>
        </>
      ) : (
        <span className="streak-countdown__hint">
          Frozen Streak será ativado em:{' '}
          <strong
            className={`streak-countdown__time tabular-nums${urgente ? ' streak-countdown__time--urgent' : ''}`}
          >
            {countdown}
          </strong>
        </span>
      )}
    </span>
  );
}
