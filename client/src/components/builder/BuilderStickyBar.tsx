import { Dumbbell, Play, Timer } from 'lucide-react';

interface Props {
  exerciseCount: number;
  estimatedMinutes: number | null;
  disabled: boolean;
  onStart: () => void;
}

export function BuilderStickyBar({ exerciseCount, estimatedMinutes, disabled, onStart }: Props) {
  const hasTime = estimatedMinutes !== null && exerciseCount > 0;

  return (
    <div className="builder-action-shelf" role="region" aria-label="Iniciar treino">
      <div className="builder-action-shelf__inner">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="builder-start-pills flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            <span className="builder-start-pill builder-start-pill--time">
              <Timer size={13} aria-hidden />
              {hasTime ? `~${estimatedMinutes} min` : '-- min'}
            </span>
            <span className="builder-start-pill builder-start-pill--count">
              <Dumbbell size={13} aria-hidden />
              {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
            </span>
          </div>
          <button type="button" className="builder-start-btn" onClick={onStart} disabled={disabled}>
            <span className="builder-start-btn__icon" aria-hidden>
              <Play size={18} fill="currentColor" />
            </span>
            Iniciar
          </button>
        </div>
      </div>
    </div>
  );
}
