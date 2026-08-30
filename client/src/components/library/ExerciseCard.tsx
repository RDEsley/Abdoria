import { memo, useCallback, useState } from 'react';
import { Lock } from 'lucide-react';
import { UnlockCelebration } from '@/components/effects/UnlockCelebration';
import { ExerciseVideoModal } from '@/components/library/ExerciseVideoModal';
import {
  ExercisePlayButton,
  PreferenceToggleButtons,
} from '@/components/library/PreferenceToggleButtons';
import { exerciseMediaUrl } from '@/lib/media';
import { successHaptic } from '@/lib/platform/native-runtime';
import { playUnlock } from '@/lib/sounds';
import type { IExerciseDocument } from '@/types';
import { PRIORIDADE_LABELS } from '@/types';
import { formatExerciseName } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';

interface Props {
  exercise: IExerciseDocument;
  compact?: boolean;
  unlocked: boolean;
  onUnlock: (slug: string) => void;
  isPinned?: boolean;
  isBlocked?: boolean;
  onTogglePin?: (slug: string) => void;
  onToggleBlock?: (slug: string) => void;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  compact,
  unlocked,
  onUnlock,
  isPinned = false,
  isBlocked = false,
  onTogglePin,
  onToggleBlock,
}: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const displayName = formatExerciseName(exercise);
  const [showVideo, setShowVideo] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  const finishUnlock = useCallback(() => {
    setUnlocking(false);
  }, []);

  const handleUnlockClick = () => {
    if (unlocked || unlocking) return;
    setUnlocking(true);
    onUnlock(exercise.slug);
    playUnlock();
    void successHaptic();
  };

  const handlePlay = () => {
    setShowVideo(true);
  };

  if (!unlocked && !unlocking) {
    return (
      <article
        className={`library-exercise-card library-exercise-card--locked ${compact ? 'p-2' : ''}`}
      >
        <button
          type="button"
          className="library-exercise-card__unlock"
          onClick={handleUnlockClick}
          disabled={unlocking}
          aria-label={`Desbloquear ${displayName}`}
        >
          <div className="library-exercise-card__media library-exercise-card__media--locked">
            <Lock size={22} strokeWidth={2.5} />
            <span className="library-exercise-card__mystery">?</span>
          </div>
          <div className="library-exercise-card__content text-left">
            <h3 className="library-exercise-card__title library-exercise-card__title--locked">
              ???
            </h3>
            <p className="library-exercise-card__meta">Exercício bloqueado</p>
            <span className="library-exercise-card__badge library-exercise-card__badge--locked">
              Toque para revelar
            </span>
          </div>
        </button>
      </article>
    );
  }

  return (
    <>
      <article className={`library-exercise-card ${compact ? 'p-2' : ''}`}>
        {unlocking && <UnlockCelebration onComplete={finishUnlock} />}
        <div className="library-exercise-card__main">
          <div className="library-exercise-card__media">
            {mediaFailed ? (
              <span className="library-exercise-card__fallback" aria-hidden>
                {displayName[0] ?? '?'}
              </span>
            ) : (
              <img
                src={exerciseMediaUrl(exercise.slug)}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setMediaFailed(true)}
              />
            )}
          </div>
          <div className="library-exercise-card__content">
            <h3 className="library-exercise-card__title">{displayName}</h3>
            <div className="library-exercise-card__details">
              <MuscleZoneLabel muscle={exercise.musculo_principal} showHint className="text-xs" />
              <p className="library-exercise-card__meta">
                Nv.{exercise.nivel} · {exercise.tempo_recomendado}s
              </p>
            </div>
            <span className="library-exercise-card__badge">
              {PRIORIDADE_LABELS[exercise.prioridade]}
            </span>
          </div>
        </div>
        {!compact && exercise.descricao && (
          <p className="library-exercise-card__description">{exercise.descricao}</p>
        )}
        <footer className="library-exercise-card__actions">
          <ExercisePlayButton onClick={handlePlay} className="library-exercise-card__play" />
          {onTogglePin && onToggleBlock && (
            <PreferenceToggleButtons
              isPinned={isPinned}
              isBlocked={isBlocked}
              onTogglePin={() => onTogglePin(exercise.slug)}
              onToggleBlock={() => onToggleBlock(exercise.slug)}
            />
          )}
        </footer>
      </article>

      {showVideo && <ExerciseVideoModal exercise={exercise} onClose={() => setShowVideo(false)} />}
    </>
  );
});
