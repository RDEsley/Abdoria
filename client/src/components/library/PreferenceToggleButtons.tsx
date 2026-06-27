import { Ban, Pin, Play } from 'lucide-react';
import {
  EXERCISE_BLOCK_OFF,
  EXERCISE_BLOCK_ON,
  EXERCISE_PIN_OFF,
  EXERCISE_PIN_ON,
  WORKOUT_BLOCK_OFF,
  WORKOUT_BLOCK_ON,
  WORKOUT_PIN_OFF,
  WORKOUT_PIN_ON,
  showPreferenceFeedback,
} from '@/components/library/PreferenceFeedback';

interface PlayProps {
  onClick: () => void;
  className?: string;
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
    showPreferenceFeedback(pinFeedback(next, feedbackKind));
    onTogglePin();
  };

  const handleBlock = () => {
    const next = !isBlocked;
    showPreferenceFeedback(blockFeedback(next, feedbackKind));
    onToggleBlock();
  };

  return (
    <div className={`game-exercise-actions ${className}`.trim()}>
      <button
        type="button"
        className={[
          'game-item-card__action-icon game-item-card__action-icon--pin',
          isPinned ? 'game-item-card__action-icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handlePin}
        aria-pressed={isPinned}
        aria-label={isPinned ? `${pinAriaLabel} (ativo)` : pinAriaLabel}
        title={pinAriaLabel}
      >
        <Pin size={13} aria-hidden />
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
  isPinned?: boolean;
  isBlocked?: boolean;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  showPlay?: boolean;
  showPreferences?: boolean;
  pinAriaLabel?: string;
  blockAriaLabel?: string;
  feedbackKind?: FeedbackKind;
  className?: string;
}

/** Grupo padronizado: ver treino + preferências. */
export function ExerciseQuickActions({
  onPlay,
  isPinned = false,
  isBlocked = false,
  onTogglePin,
  onToggleBlock,
  showPlay = false,
  showPreferences = false,
  pinAriaLabel,
  blockAriaLabel,
  feedbackKind = 'exercise',
  className = '',
}: QuickActionsProps) {
  return (
    <div className={`game-exercise-actions ${className}`.trim()}>
      {showPlay && onPlay && <ExercisePlayButton onClick={onPlay} />}
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
