import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { InventoryModal } from '@/components/inventory/InventoryModal';
import { EnergyDrinkIcon } from '@/lib/daily-shop-display';
import { updateMetaPreferences } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ENERGY_DRINK_BONUS_XP } from '@/types';

interface Props {
  open: boolean;
  energyDrinkCount: number;
  onContinue: () => void;
  onCancel: () => void;
}

export function DailyXpCapModal({ open, energyDrinkCount, onContinue, onCancel }: Props) {
  const { applyUser } = useAuth();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  if (!open) return null;

  const hasDrink = energyDrinkCount > 0;

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

  if (showInventory) {
    return (
      <InventoryModal
        open
        onClose={() => setShowInventory(false)}
      />
    );
  }

  return createPortal(
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="xp-cap-title">
      <div className="game-modal game-modal--wide">
        <h2 id="xp-cap-title" className="game-modal__title flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden /> Máx. diário de XP
        </h2>

        {hasDrink ? (
          <>
            <p className="game-modal__text">
              Você já atingiu o máx. de XP de exercícios hoje. Use um Energy Drink para ganhar{' '}
              <strong>+{ENERGY_DRINK_BONUS_XP} XP bônus</strong> que não conta no máx. diário!
            </p>
            <div className="game-inventory-item game-inventory-item--compact">
              <div className="game-inventory-item__icon">
                <EnergyDrinkIcon size={28} />
              </div>
              <div className="game-inventory-item__info">
                <p className="game-inventory-item__count">
                  Você tem <strong>{energyDrinkCount}</strong> no inventário
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <GameButton size="lg" className="w-full" onClick={() => setShowInventory(true)}>
                <EnergyDrinkIcon size={16} /> Usar Energy Drink
              </GameButton>
              <GameButton size="lg" variant="secondary" className="w-full" onClick={onContinue}>
                Treinar mesmo assim
              </GameButton>
              <GameButton size="sm" variant="ghost" className="w-full" onClick={onCancel}>
                Cancelar
              </GameButton>
            </div>
          </>
        ) : (
          <>
            <p className="game-modal__text">
              Você já atingiu o máx. diário de XP de exercícios. Treinar agora não dará XP de exercícios
              (bônus de streak, conquistas e loja ainda funcionam).
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
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
