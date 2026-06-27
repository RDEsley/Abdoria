import { Timer } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface Props {
  secondsLeft: number;
  targetSeconds: number;
  paused: boolean;
  label?: string;
}

/** Cronômetro de exercício isométrico / baseado em tempo. */
export function WorkoutExerciseTimer({
  secondsLeft,
  targetSeconds,
  paused,
  label = 'Segure a posição',
}: Props) {
  const progress = targetSeconds > 0 ? ((targetSeconds - secondsLeft) / targetSeconds) * 100 : 0;

  return (
    <div className={`game-workout-timer${paused ? ' game-workout-timer--paused' : ''}`}>
      <div className="game-workout-timer__badge">
        <Timer size={14} aria-hidden />
        Isometria · cronômetro automático
      </div>
      <p className="game-workout-timer__label">{label}</p>
      <p className="game-workout-timer__clock tabular-nums">{formatTime(secondsLeft)}</p>
      <div
        className="game-workout-timer__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={targetSeconds}
        aria-valuenow={targetSeconds - secondsLeft}
      >
        <span
          className="game-workout-timer__fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="game-workout-timer__hint">
        {paused ? 'Pausado — retome quando estiver pronto.' : 'O tempo avança sozinho até completar a série.'}
      </p>
    </div>
  );
}
