import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon } from '@/lib/daily-shop-display';
import { getInventory, useEnergyDrink } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { ENERGY_DRINK_BONUS_XP } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SelectedItem = 'energy_drink' | null;

export function InventoryModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [energyCount, setEnergyCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usingEnergy, setUsingEnergy] = useState(false);
  const [selected, setSelected] = useState<SelectedItem>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setEnergyCount(data.energy_drink);
      setQuantity((q) => Math.min(q, Math.max(1, data.energy_drink)));
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o inventário.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setQuantity(1);
    if (stats?.energy_drink_count !== undefined) {
      setEnergyCount(stats.energy_drink_count);
    }
    void load();
  }, [open, load, stats?.energy_drink_count]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, selected]);

  const handleUseEnergy = async () => {
    if (quantity < 1 || quantity > energyCount) return;
    setUsingEnergy(true);
    try {
      const res = await useEnergyDrink(quantity);
      applyUser(res.user);
      await refreshApp();
      setEnergyCount(res.inventario.energy_drink);
      setQuantity(Math.min(quantity, Math.max(1, res.inventario.energy_drink)));
      showGameToast(`+${res.bonus_added} XP bônus ativado!`, { variant: 'success' });
      setSelected(null);
      window.dispatchEvent(
        new CustomEvent('abdoria:energy-drink-used', { detail: { bonus_added: res.bonus_added } }),
      );
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar Energy Drink.'), { variant: 'error' });
    } finally {
      setUsingEnergy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="game-inventory-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-title"
      onClick={onClose}
    >
      <motion.div
        className="game-inventory-modal game-modal"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-modal__close-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <h2 id="inventory-title" className="game-modal__title">
          Inventário
        </h2>
        <p className="game-modal__text">Toque em um item para usar.</p>

        <div className="game-inventory-grid">
          <button
            type="button"
            className={`game-inventory-slot${energyCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'energy_drink' ? ' game-inventory-slot--active' : ''}`}
            disabled={energyCount < 1 || loading}
            onClick={() => {
              setSelected('energy_drink');
              setQuantity(Math.min(1, energyCount) || 1);
            }}
            aria-label={`Energy Drink, ${energyCount} em estoque`}
          >
            <span className="game-inventory-slot__icon">
              <EnergyDrinkIcon size={36} />
            </span>
            {energyCount > 0 && (
              <span className="game-inventory-slot__qty tabular-nums">{energyCount}</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {selected === 'energy_drink' && (
            <motion.div
              className="game-inventory-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h3 className="game-inventory-detail__title">Energy Drink</h3>
              <p className="game-inventory-detail__desc">
                +{ENERGY_DRINK_BONUS_XP} XP bônus por unidade — não conta no teto diário.
              </p>

              <div className="game-inventory-use">
                <span className="game-inventory-use__label">Quantidade</span>
                <div className="game-inventory-use__stepper">
                  <button
                    type="button"
                    className="game-inventory-use__btn"
                    disabled={quantity <= 1 || usingEnergy}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="game-inventory-use__value tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    className="game-inventory-use__btn"
                    disabled={quantity >= energyCount || usingEnergy}
                    onClick={() => setQuantity((q) => Math.min(energyCount, q + 1))}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="game-inventory-use__hint">
                  <Zap size={12} aria-hidden /> Total: +{quantity * ENERGY_DRINK_BONUS_XP} XP bônus
                </p>
              </div>

              <div className="game-inventory-detail__actions">
                <GameButton variant="secondary" onClick={() => setSelected(null)} disabled={usingEnergy}>
                  Cancelar
                </GameButton>
                <GameButton onClick={() => void handleUseEnergy()} disabled={usingEnergy || energyCount < 1}>
                  {usingEnergy ? 'Usando...' : 'Usar'}
                </GameButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}
