import { Ban, Pin, Play, Shuffle } from 'lucide-react';
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
} from '@/components/ui/GameToast';

interface PlayProps {
  onClick: () => void;
  className?: string;
}

interface SwapProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Ícone para trocar o treino selecionado por opção muscular similar. */
export function SwapWorkoutButton({ onClick, disabled = false, className = '' }: SwapProps) {
  return (
    <button
      type="button"
      className={`game-item-card__action-icon game-item-card__action-icon--swap ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label="Trocar treino"
      title="Trocar treino"
    >
      <Shuffle size={13} aria-hidden />
    </button>
  );
}

/** Botão de ver demonstração — design original pixel verde. */
export function ExercisePlayButton({ onClick, className = '' }: PlayProps) {
  return (
    <button
      type="button"
      className={`game-item-card__play ${className}`.trim()}
      onClick={onClick}
      aria-label="Ver treino"
    >
      <Play size={14} fill="currentColor" aria-hidden />
      Ver treino
    </button>
  );
}

type FeedbackKind = 'exercise' | 'workout';

interface PrefProps {
  isPinned: boolean;
  isBlocked: boolean;
  onTogglePin: () => void;
  onToggleBlock: () => void;
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

/** Botões icônicos pin/ban — mesmo visual pixel do botão Ver treino. */
export function PreferenceToggleButtons({
  isPinned,
  isBlocked,
  onTogglePin,
  onToggleBlock,
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
      <button
        type="button"
        className={[
          'game-item-card__action-icon game-item-card__action-icon--pin',
          isPinned ? 'game-item-card__action-icon--active game-item-card__action-icon--pin-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handlePin}
        aria-pressed={isPinned}
        aria-label={isPinned ? `${pinAriaLabel} (ativo)` : pinAriaLabel}
        title={pinAriaLabel}
      >
        <Pin size={13} fill={isPinned ? 'currentColor' : 'none'} strokeWidth={isPinned ? 2.5 : 2} aria-hidden />
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

interface QuickActionsProps {
  onPlay?: () => void;
  onSwapWorkout?: () => void;
  isPinned?: boolean;
  isBlocked?: boolean;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  showPlay?: boolean;
  showSwapWorkout?: boolean;
  swapWorkoutDisabled?: boolean;
  showPreferences?: boolean;
  pinAriaLabel?: string;
  blockAriaLabel?: string;
  feedbackKind?: FeedbackKind;
  className?: string;
}

/** Grupo padronizado: ver treino + preferências. */
export function ExerciseQuickActions({
  onPlay,
  onSwapWorkout,
  isPinned = false,
  isBlocked = false,
  onTogglePin,
  onToggleBlock,
  showPlay = false,
  showSwapWorkout = false,
  swapWorkoutDisabled = false,
  showPreferences = false,
  pinAriaLabel,
  blockAriaLabel,
  feedbackKind = 'exercise',
  className = '',
}: QuickActionsProps) {
  return (
    <div className={`game-exercise-actions ${className}`.trim()}>
      {showPlay && onPlay && <ExercisePlayButton onClick={onPlay} />}
      {showSwapWorkout && onSwapWorkout && (
        <SwapWorkoutButton onClick={onSwapWorkout} disabled={swapWorkoutDisabled} />
      )}
      {showPreferences && onTogglePin && onToggleBlock && (
        <PreferenceToggleButtons
          isPinned={isPinned}
          isBlocked={isBlocked}
          onTogglePin={onTogglePin}
          onToggleBlock={onToggleBlock}
          pinAriaLabel={pinAriaLabel}
          blockAriaLabel={blockAriaLabel}
          feedbackKind={feedbackKind}
        />
      )}
    </div>
  );
}
