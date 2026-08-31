import { useCallback, useEffect, useState } from 'react';
import { LogOut, Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { clearWorkoutDurationSession } from '@/lib/workout-duration';
import {
  webWorkoutSessionStorage,
  type ActiveWorkoutSnapshot,
} from '@/lib/workout-session-storage';

/** Recuperação global para treino interrompido por navegação, reload ou suspensão do celular. */
export function ResumeWorkoutPrompt() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ActiveWorkoutSnapshot | null>(() =>
    webWorkoutSessionStorage.read(),
  );

  const refresh = useCallback(() => setSnapshot(webWorkoutSessionStorage.read()), []);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('evolyn:app-state', refresh);
    window.addEventListener('evolyn:workout-snapshot', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('evolyn:app-state', refresh);
      window.removeEventListener('evolyn:workout-snapshot', refresh);
    };
  }, [refresh]);

  if (!snapshot) return null;
  const current = snapshot.workout.queue[snapshot.exerciseIndex];

  const quit = () => {
    webWorkoutSessionStorage.clear();
    clearWorkoutDurationSession();
    setSnapshot(null);
  };

  return (
    <Modal
      open
      onClose={() => undefined}
      disableDismiss
      variant="bare"
      overlayClassName="resume-workout-overlay"
      panelClassName="resume-workout-card"
      labelledBy="resume-workout-title"
    >
      <motion.span
        className="resume-workout-card__icon"
        initial={{ scale: 0.5, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        <RotateCcw size={25} aria-hidden />
      </motion.span>
      <p className="resume-workout-card__eyebrow">Sua missão continua</p>
      <h2 id="resume-workout-title">Voltar de onde parou?</h2>
      <p>
        <strong>{current?.nome ?? snapshot.workout.treino_nome}</strong>
        <span>
          Exercício {snapshot.exerciseIndex + 1} de {snapshot.workout.queue.length} · série{' '}
          {snapshot.setIndex + 1}
        </span>
      </p>
      <GameButton
        size="lg"
        className="w-full flex items-center justify-center gap-2"
        onClick={() => navigate('/player', { state: { resumingWorkout: true } })}
      >
        <Play size={19} fill="currentColor" aria-hidden /> Voltar a treinar
      </GameButton>
      <GameButton
        size="lg"
        variant="ghost"
        className="w-full flex items-center justify-center gap-2 !text-red-700"
        onClick={quit}
      >
        <LogOut size={17} aria-hidden /> Desistir deste treino
      </GameButton>
    </Modal>
  );
}
