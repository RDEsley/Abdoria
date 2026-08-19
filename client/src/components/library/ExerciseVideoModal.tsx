import { useState } from 'react';
import { X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { exerciseMediaUrl } from '@/lib/media';
import type { IExerciseDocument } from '@/types';
import { PRIORIDADE_LABELS, formatExerciseName } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';
import { useAuth } from '@/context/AuthContext';
import { isPushUpExerciseSlug } from '@shared/exercises';

interface Props {
  exercise: IExerciseDocument;
  onClose: () => void;
}

export function ExerciseVideoModal({ exercise, onClose }: Props) {
  const { user } = useAuth();
  const [mediaError, setMediaError] = useState(false);
  const displayName = formatExerciseName(exercise);
  const gifUrl = exerciseMediaUrl(exercise.slug, 'gif');

  return (
    <Modal open onClose={onClose} variant="wide" labelledBy="exercise-video-title">
      <button type="button" onClick={onClose} className="game-modal__close-btn" aria-label="Fechar">
        <X size={18} />
      </button>

      <h2 id="exercise-video-title" className="game-modal__title">
        {displayName}
      </h2>
      <div className="mt-1">
        <MuscleZoneLabel muscle={exercise.musculo_principal} showHint />
      </div>
      <p className="game-modal__text mt-2">
        Nv.{exercise.nivel} · {exercise.tempo_recomendado}s ·{' '}
        {PRIORIDADE_LABELS[exercise.prioridade]}
      </p>

      {exercise.descricao && <p className="game-modal__desc">{exercise.descricao}</p>}
      {user?.nivel === 'iniciante' && isPushUpExerciseSlug(exercise.slug) && (
        <p className="game-modal__desc rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
          Se a flexão completa ainda estiver difícil, apoie os joelhos no chão e mantenha o tronco
          alinhado. Volte à versão completa quando ganhar força.
        </p>
      )}

      <div className="game-video-frame">
        {mediaError ? (
          <div className="game-video-frame__placeholder">
            <p className="game-modal__text">Demonstração em breve para este exercício.</p>
          </div>
        ) : (
          <img
            key={exercise.slug}
            src={gifUrl}
            alt={`Demonstração: ${displayName}`}
            className="h-full w-full object-contain"
            onError={() => setMediaError(true)}
          />
        )}
      </div>

      <GameButton variant="secondary" className="game-modal__close mt-4" onClick={onClose}>
        Fechar
      </GameButton>
    </Modal>
  );
}
