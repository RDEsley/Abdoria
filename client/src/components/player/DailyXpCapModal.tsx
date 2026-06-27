import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { updateMetaPreferences } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Props {
  open: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function DailyXpCapModal({ open, onContinue, onCancel }: Props) {
  const { applyUser } = useAuth();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  if (!open) return null;

  const handleContinue = async () => {
    if (dontShowAgain) {
      setSavingPref(true);
      try {
        const user = await updateMetaPreferences({ ocultar_aviso_xp_diario: true });
        applyUser(user);
      } finally {
        setSavingPref(false);
      }
    }
    onContinue();
  };

  return createPortal(
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="xp-cap-title">
      <div className="game-modal game-modal--wide">
        <h2 id="xp-cap-title" className="game-modal__title flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden /> Máx. diário de XP
        </h2>
        <p className="game-modal__text">
          Você já atingiu o máx. diário de XP (exercícios, streak e conquistas). Treinar agora não renderá mais XP
          hoje.
        </p>
        <label className="game-inventory-dont-show mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold text-stone-600">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="cursor-pointer"
          />
          Não mostrar este aviso novamente
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <GameButton size="lg" className="w-full flex items-center justify-center gap-2" disabled={savingPref} onClick={() => void handleContinue()}>
            <Zap size={16} /> Continuar treino
          </GameButton>
          <GameButton size="lg" variant="secondary" className="w-full" onClick={onCancel}>
            Cancelar
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
