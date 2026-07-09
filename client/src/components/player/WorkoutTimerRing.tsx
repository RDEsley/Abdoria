import { Play } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import type { ModoExercicio } from '@/types';

interface Props {
  phase: 'ready' | 'working' | 'resting';
  modo: ModoExercicio;
  secondsLeft: number;
  seriesIndex: number;
  totalSeries: number;
  progressPct: number;
}

/** Anel de progresso do treino: contagem de exercício/descanso ou série atual. */
export function WorkoutTimerRing({
  phase,
  modo,
  secondsLeft,
  seriesIndex,
  totalSeries,
  progressPct,
}: Props) {
  const ringStroke = phase === 'resting' ? '#0284c7' : '#059669';

  const center =
    phase === 'resting' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
        <span className="game-timer-ring__sublabel">descanso</span>
      </>
    ) : phase === 'working' && modo === 'tempo' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
        <span className="game-timer-ring__sublabel">exercício</span>
      </>
    ) : phase === 'working' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">
          {seriesIndex + 1}/{totalSeries}
        </span>
        <span className="game-timer-ring__sublabel">série</span>
      </>
    ) : (
      <>
        <Play size={32} className="text-emerald-500" />
        <span className="game-timer-ring__sublabel mt-1">pronta</span>
      </>
    );

  return (
    <div
      className={`game-timer-ring ${phase === 'resting' ? 'game-timer-ring--rest' : ''}`}
      aria-hidden
    >
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
          strokeDasharray={`${progressPct * 2.83} 283`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
    </div>
  );
}
