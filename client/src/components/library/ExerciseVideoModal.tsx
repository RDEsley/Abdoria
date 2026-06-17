import { useState } from 'react';
import { X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { exerciseMediaUrl } from '@/lib/media';
import type { IExerciseDocument } from '@/types';
import { PRIORIDADE_LABELS, formatExerciseName } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';

interface Props {
  exercise: IExerciseDocument;
  onClose: () => void;
}

export function ExerciseVideoModal({ exercise, onClose }: Props) {
  const [videoError, setVideoError] = useState(false);
  const displayName = formatExerciseName(exercise);

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="exercise-video-title">
      <div className="game-modal game-modal--wide">
        <button
          type="button"
          onClick={onClose}
          className="game-modal__close-btn"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <h2 id="exercise-video-title" className="game-modal__title">
          {displayName}
        </h2>
        <div className="mt-1">
          <MuscleZoneLabel muscle={exercise.musculo_principal} showHint />
        </div>
        <p className="game-modal__text mt-2">
          Nv.{exercise.nivel} · {exercise.tempo_recomendado}s · {PRIORIDADE_LABELS[exercise.prioridade]}
        </p>

        {exercise.descricao && <p className="game-modal__desc">{exercise.descricao}</p>}

        <div className="game-video-frame">
          {videoError ? (
            <div className="game-video-frame__placeholder">
              <p className="game-modal__text">Vídeo em breve para este exercício.</p>
              <img
                src={exerciseMediaUrl(exercise.slug)}
                alt={displayName}
                className="mt-3 max-h-48 w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <video
              key={exercise.slug}
              className="h-full w-full object-contain"
              src={exerciseMediaUrl(exercise.slug, 'mp4')}
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
            />
          )}
        </div>

        <GameButton variant="secondary" className="game-modal__close mt-4" onClick={onClose}>
          Fechar
        </GameButton>
      </div>
    </div>
  );
}
