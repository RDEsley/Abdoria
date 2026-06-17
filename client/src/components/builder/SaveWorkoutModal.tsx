import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  open: boolean;
  defaultName?: string;
  isUpdate?: boolean;
  onClose: () => void;
  onSave: (nome: string) => void;
}

export function SaveWorkoutModal({ open, defaultName = 'Meu Treino', isUpdate, onClose, onSave }: Props) {
  const [nome, setNome] = useState(defaultName);

  useEffect(() => {
    if (open) setNome(defaultName);
  }, [open, defaultName]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-modal w-full max-w-md !p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-workout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-modal__close-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <h2 id="save-workout-title" className="game-modal__title">
          {isUpdate ? 'Atualizar treino salvo' : 'Salvar treino'}
        </h2>
        <p className="game-modal__text">
          {isUpdate
            ? 'Atualize o nome ou confirme para guardar as alterações na aba de treinos sugeridos.'
            : 'Dê um nome ao seu treino para encontrá-lo depois em Treinos sugeridos.'}
        </p>

        <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
          Nome do treino
        </label>
        <input
          className="game-input mt-2 w-full"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Meu treino de abdômen"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />

        <GameButton
          className="mt-4 flex w-full items-center justify-center gap-2"
          disabled={!nome.trim()}
          onClick={handleSave}
        >
          <Bookmark size={18} />
          {isUpdate ? 'Atualizar treino' : 'Salvar treino'}
        </GameButton>
      </motion.div>
    </div>
  );
}
