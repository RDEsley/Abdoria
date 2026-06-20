import { useCallback, useState } from 'react';
import { Ban, Lock, Pin, Play } from 'lucide-react';
import { UnlockCelebration } from '@/components/effects/UnlockCelebration';
import { ExerciseVideoModal } from '@/components/library/ExerciseVideoModal';
import { exerciseMediaUrl } from '@/lib/media';
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

export function ExerciseCard({
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

  const finishUnlock = useCallback(() => {
    onUnlock(exercise.slug);
    setUnlocking(false);
  }, [exercise.slug, onUnlock]);

  const handleUnlockClick = () => {
    if (unlocked || unlocking) return;
    setUnlocking(true);
    playUnlock();
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVideo(true);
  };

  if (!unlocked) {
    return (
      <article className={`game-item-card game-item-card--locked ${compact ? 'p-2' : ''}`}>
        <button
          type="button"
          className="game-item-card__unlock-btn"
          onClick={handleUnlockClick}
          disabled={unlocking}
          aria-label={`Desbloquear ${displayName}`}
        >
          <div className="game-item-card__thumb game-item-card__thumb--locked">
            {unlocking ? (
              <UnlockCelebration onComplete={finishUnlock} />
            ) : (
              <>
                <Lock size={22} strokeWidth={2.5} />
                <span className="game-item-card__mystery">?</span>
              </>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="game-item-card__hidden-title">???</h3>
            <p className="mt-1 text-xs font-bold text-stone-400">Habilidade secreta</p>
            <span className="game-item-card__rarity game-item-card__rarity--locked">Toque para revelar</span>
          </div>
        </button>
      </article>
    );
  }

  return (
    <>
      <article className={`game-item-card game-item-card--unlocked ${compact ? 'p-2' : ''}`}>
        <div className="flex gap-3">
          <div className="game-item-card__thumb">
            <img
              src={exerciseMediaUrl(exercise.slug)}
              alt={displayName}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const fallback = document.createElement('span');
                  fallback.className = 'text-lg font-extrabold text-stone-400';
                  fallback.textContent = exercise.nome[0] ?? '?';
                  e.currentTarget.parentElement.appendChild(fallback);
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold leading-tight text-stone-900">{displayName}</h3>
            <div className="mt-0.5">
              <MuscleZoneLabel muscle={exercise.musculo_principal} showHint className="text-xs" />
              <p className="mt-0.5 text-xs font-semibold text-stone-500">
                Nv.{exercise.nivel} · {exercise.tempo_recomendado}s
              </p>
            </div>
            <span className="game-item-card__rarity">{PRIORIDADE_LABELS[exercise.prioridade]}</span>
            {!compact && exercise.descricao && (
              <p className="mt-2 line-clamp-2 text-xs text-stone-500">{exercise.descricao}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="game-item-card__play" onClick={handlePlay}>
                <Play size={14} fill="currentColor" /> Ver treino
              </button>
              {onTogglePin && (
                <button
                  type="button"
                  className={`game-item-card__pref${isPinned ? ' game-item-card__pref--active' : ''}`}
                  onClick={() => onTogglePin(exercise.slug)}
                  aria-pressed={isPinned}
                >
                  <Pin size={13} aria-hidden /> {isPinned ? 'Sempre incluir ✓' : 'Sempre incluir'}
                </button>
              )}
              {onToggleBlock && (
                <button
                  type="button"
                  className={`game-item-card__pref game-item-card__pref--block${isBlocked ? ' game-item-card__pref--active' : ''}`}
                  onClick={() => onToggleBlock(exercise.slug)}
                  aria-pressed={isBlocked}
                >
                  <Ban size={13} aria-hidden /> {isBlocked ? 'Bloqueado ✓' : 'Não recomendar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {showVideo && <ExerciseVideoModal exercise={exercise} onClose={() => setShowVideo(false)} />}
    </>
  );
}
