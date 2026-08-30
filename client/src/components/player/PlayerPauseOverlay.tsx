import { LogOut, Play, RotateCcw } from 'lucide-react';
import { ExerciseDemo } from '@/components/exercises/ExerciseDemo';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import type { IExerciseDocument } from '@/types';
import { formatExerciseName } from '@/types';

interface Props {
  exercise: IExerciseDocument;
  exerciseIndex: number;
  exerciseCount: number;
  setIndex: number;
  setCount: number;
  sideLabel?: string | null;
  isResting: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PlayerPauseOverlay({
  exercise,
  exerciseIndex,
  exerciseCount,
  setIndex,
  setCount,
  sideLabel,
  isResting,
  onResume,
  onRestart,
  onExit,
}: Props) {
  const name = formatExerciseName(exercise);
  return (
    <Modal
      open
      onClose={onResume}
      disableDismiss
      variant="bare"
      overlayClassName="game-player-pause-overlay"
      panelClassName="game-player-pause-panel"
      labelledBy="player-pause-title"
    >
      <p className="game-player-pause-panel__progress">
        Exercício {exerciseIndex + 1} de {exerciseCount} · série {setIndex + 1} de {setCount}
      </p>
      <ExerciseDemo
        name={name}
        mediaFile={exercise.media?.gif}
        decorative
        className="game-player-pause-panel__demo"
      />
      <div>
        <p className="game-player-pause-panel__eyebrow">
          {isResting ? 'Descanso pausado' : 'Treino pausado'}
        </p>
        <h2 id="player-pause-title">{name}</h2>
        {sideLabel && <p className="game-player-pause-panel__side">{sideLabel}</p>}
      </div>

      <GameButton
        size="lg"
        className="w-full flex items-center justify-center gap-2"
        onClick={onResume}
      >
        <Play size={20} fill="currentColor" /> Retomar
      </GameButton>
      <GameButton
        size="lg"
        variant="secondary"
        className="w-full flex items-center justify-center gap-2"
        onClick={onRestart}
      >
        <RotateCcw size={18} /> {isResting ? 'Reiniciar descanso' : 'Reiniciar série'}
      </GameButton>
      <button type="button" className="game-player-pause-panel__exit" onClick={onExit}>
        <LogOut size={17} aria-hidden /> Sair do treino
      </button>
    </Modal>
  );
}
