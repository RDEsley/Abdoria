import { Ban, Pin, Play } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import {
  EXERCISE_BLOCK_OFF,
  EXERCISE_BLOCK_ON,
  EXERCISE_PIN_OFF,
  EXERCISE_PIN_ON,
  WORKOUT_BLOCK_OFF,
  WORKOUT_BLOCK_ON,
  WORKOUT_PIN_OFF,
  WORKOUT_PIN_ON,
  showGameToast,
} from '@/lib/game-toast';

interface PlayProps {
  onClick: () => void;
  className?: string;
}

export function ExercisePlayButton({ onClick, className = '' }: PlayProps) {
  return (
    <GameButton
      type="button"
      variant="secondary"
      size="sm"
      className={`flex items-center gap-1.5 ${className}`.trim()}
      onClick={onClick}
      aria-label="Como fazer o exercício"
    >
      <Play size={14} aria-hidden />
      Como fazer
    </GameButton>
  );
}

type FeedbackKind = 'exercise' | 'workout';

interface PrefProps {
  isPinned: boolean;
  isBlocked: boolean;
  onTogglePin: () => void;
  onToggleBlock: () => void;
  onSwapWorkout?: () => void;
  swapWorkoutDisabled?: boolean;
  swapAriaLabel?: string;
  pinAriaLabel?: string;
  blockAriaLabel?: string;
  feedbackKind?: FeedbackKind;
  className?: string;
}

function pinFeedback(nextPinned: boolean, kind: FeedbackKind): string {
  if (kind === 'workout') return nextPinned ? WORKOUT_PIN_ON : WORKOUT_PIN_OFF;
  return nextPinned ? EXERCISE_PIN_ON : EXERCISE_PIN_OFF;
}

function blockFeedback(nextBlocked: boolean, kind: FeedbackKind): string {
  if (kind === 'workout') return nextBlocked ? WORKOUT_BLOCK_ON : WORKOUT_BLOCK_OFF;
  return nextBlocked ? EXERCISE_BLOCK_ON : EXERCISE_BLOCK_OFF;
}

export function PreferenceToggleButtons({
  isPinned,
  isBlocked,
  onTogglePin,
  onToggleBlock,
  onSwapWorkout,
  swapWorkoutDisabled = false,
  swapAriaLabel = 'Trocar treino similar',
  pinAriaLabel = 'Sempre incluir',
  blockAriaLabel = 'Não recomendar',
  feedbackKind = 'exercise',
  className = '',
}: PrefProps) {
  const handlePin = () => {
    const next = !isPinned;
    showGameToast(pinFeedback(next, feedbackKind), { variant: 'success' });
    onTogglePin();
  };

  const handleBlock = () => {
    const next = !isBlocked;
    showGameToast(blockFeedback(next, feedbackKind), { variant: 'info' });
    onToggleBlock();
  };

  return (
    <div className={`game-exercise-actions ${className}`.trim()}>
      {onSwapWorkout && (
        <GameButton
          variant="secondary"
          size="sm"
          className="game-exercise-actions__swap"
          onClick={onSwapWorkout}
          disabled={swapWorkoutDisabled}
        >
          {swapAriaLabel}
        </GameButton>
      )}
      <button
        type="button"
        className={[
          'game-item-card__action-icon game-item-card__action-icon--pin',
          isPinned
            ? 'game-item-card__action-icon--active game-item-card__action-icon--pin-active'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handlePin}
        aria-pressed={isPinned}
        aria-label={isPinned ? `${pinAriaLabel} (ativo)` : pinAriaLabel}
        title={pinAriaLabel}
      >
        <Pin
          size={13}
          fill={isPinned ? 'currentColor' : 'none'}
          strokeWidth={isPinned ? 2.5 : 2}
          aria-hidden
        />
      </button>
      <button
        type="button"
        className={[
          'game-item-card__action-icon game-item-card__action-icon--block',
          isBlocked ? 'game-item-card__action-icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleBlock}
        aria-pressed={isBlocked}
        aria-label={isBlocked ? `${blockAriaLabel} (ativo)` : blockAriaLabel}
        title={blockAriaLabel}
      >
        <Ban size={13} aria-hidden />
      </button>
    </div>
  );
}
