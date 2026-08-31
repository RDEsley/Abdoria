import { LogOut, Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';

export function WorkoutRecoveryModal({
  exerciseName,
  progress,
  onResume,
  onQuit,
}: {
  exerciseName: string;
  progress: string;
  onResume: () => void;
  onQuit: () => void;
}) {
  return (
    <Modal
      open
      onClose={() => undefined}
      disableDismiss
      variant="bare"
      overlayClassName="resume-workout-overlay"
      panelClassName="resume-workout-card"
      labelledBy="player-recovery-title"
    >
      <motion.span
        className="resume-workout-card__icon"
        initial={{ scale: 0.5, rotate: -35 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 17 }}
      >
        <RotateCcw size={25} aria-hidden />
      </motion.span>
      <p className="resume-workout-card__eyebrow">Treino recuperado</p>
      <h2 id="player-recovery-title">Tudo está no lugar</h2>
      <p>
        <strong>{exerciseName}</strong>
        <span>{progress}</span>
      </p>
      <GameButton
        size="lg"
        className="w-full flex items-center justify-center gap-2"
        onClick={onResume}
      >
        <Play size={19} fill="currentColor" aria-hidden /> Voltar a treinar
      </GameButton>
      <GameButton
        size="lg"
        variant="ghost"
        className="w-full flex items-center justify-center gap-2 !text-red-700"
        onClick={onQuit}
      >
        <LogOut size={17} aria-hidden /> Desistir deste treino
      </GameButton>
    </Modal>
  );
}
