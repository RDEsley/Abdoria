import { motion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onQuit: () => void;
}

/** Confirmação de desistência do treino — Escape/clique fora equivalem a continuar treinando. */
export function QuitWorkoutModal({ open, onClose, onQuit }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="bare"
      panelClassName="w-full max-w-sm"
      labelledBy="quit-workout-title"
      role="alertdialog"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-victory !p-6"
      >
        <h3 id="quit-workout-title" className="game-victory__title !text-base">
          Desistir do treino?
        </h3>
        <p className="mt-2 text-sm font-bold text-stone-600">
          Se você sair agora, este treino não será contado — nada do que fez até aqui será salvo.
          Para treinar de novo, volte na aba <strong>Missão</strong> (ícone de haltere) e inicie
          outro treino.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <GameButton size="lg" className="w-full" onClick={onClose}>
            Continuar treinando
          </GameButton>
          <GameButton variant="ghost" size="lg" className="w-full !text-red-700" onClick={onQuit}>
            Sim, desistir
          </GameButton>
        </div>
      </motion.div>
    </Modal>
  );
}
