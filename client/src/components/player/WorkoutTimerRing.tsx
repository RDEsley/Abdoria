import { Pause, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatTime } from '@/lib/utils';
import type { ModoExercicio } from '@/types';

interface Props {
  phase: 'ready' | 'working' | 'resting';
  modo: ModoExercicio;
  secondsLeft: number;
  seriesIndex: number;
  totalSeries: number;
  targetReps?: number;
  progressPct: number;
  paused?: boolean;
  /** Presente = o anel vira um botão (iniciar série ou pausar/retomar). */
  onCenterClick?: () => void;
  clickLabel?: string;
}

/**
 * Anel de progresso do treino: contagem de exercício/descanso ou série
 * atual. Quando `onCenterClick` é passado, o próprio anel funciona como
 * botão — clicar no centro inicia a série (ícone de play) ou pausa/retoma
 * o cronômetro em andamento (número ↔ ícone de pausa).
 */
export function WorkoutTimerRing({
  phase,
  modo,
  secondsLeft,
  seriesIndex,
  totalSeries,
  targetReps,
  progressPct,
  paused = false,
  onCenterClick,
  clickLabel,
}: Props) {
  const reduceMotion = useReducedMotion();
  const ringStroke = phase === 'resting' ? 'var(--game-sky-dark)' : 'var(--game-green-dark)';
  const normalizedProgress = Math.min(100, Math.max(0, progressPct));
  const circumference = 2 * Math.PI * 45;

  const center =
    phase === 'resting' || (phase === 'working' && modo === 'tempo') ? (
      paused ? (
        <>
          <Pause size={30} className="text-stone-500" />
          <span className="game-timer-ring__sublabel mt-1">pausado</span>
        </>
      ) : (
        <>
          <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
          <span className="game-timer-ring__sublabel">
            {phase === 'resting' ? 'descanso' : 'exercício'}
          </span>
        </>
      )
    ) : phase === 'working' ? (
      <>
        <span className="game-timer-ring__label game-timer-ring__label--reps tabular-nums">
          × {targetReps ?? 0}
        </span>
        <span className="game-timer-ring__sublabel">
          repetições · série {seriesIndex + 1}/{totalSeries}
        </span>
      </>
    ) : (
      <>
        <Play size={32} className="text-emerald-500" />
        <span className="game-timer-ring__sublabel mt-1">pronta</span>
      </>
    );

  const svg = (
    <svg className="game-timer-ring__svg -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e7e5e4" strokeWidth="6" />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={ringStroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - normalizedProgress / 100)}
        className="game-timer-ring__progress"
      />
    </svg>
  );

  if (onCenterClick) {
    return (
      <motion.button
        type="button"
        onClick={onCenterClick}
        className={`game-timer-ring game-timer-ring--action ${phase === 'resting' ? 'game-timer-ring--rest' : ''}`}
        aria-label={clickLabel}
        whileTap={reduceMotion ? undefined : { scale: 0.93, rotate: -2 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      >
        {svg}
        <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
      </motion.button>
    );
  }

  return (
    <div
      className={`game-timer-ring ${phase === 'resting' ? 'game-timer-ring--rest' : ''}`}
      aria-hidden
    >
      {svg}
      <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
    </div>
  );
}
