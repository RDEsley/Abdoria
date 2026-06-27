import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Minus, Plus, X, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon, PatrolCacheIcon, RouteDrinkIcon } from '@/lib/daily-shop-display';
import { getInventory, useEnergyDrink } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import {
  ENERGY_DRINK_BONUS_XP,
  INVENTORY_STACK_CAP,
  PATROL_CACHE_LABEL,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_LABEL,
} from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SelectedItem = 'energy_drink' | 'route_drink' | 'bau_patrulha' | null;

export function InventoryModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [energyCount, setEnergyCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [bauCount, setBauCount] = useState(0);
  const [stackCap, setStackCap] = useState(INVENTORY_STACK_CAP);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usingEnergy, setUsingEnergy] = useState(false);
  const [selected, setSelected] = useState<SelectedItem>(null);

  const applyCounts = useCallback((data: { energy_drink: number; route_drink: number; bau_patrulha: number; stack_cap?: number }) => {
    setEnergyCount(data.energy_drink);
    setRouteCount(data.route_drink);
    setBauCount(data.bau_patrulha);
    setStackCap(data.stack_cap ?? INVENTORY_STACK_CAP);
    setQuantity((q) => Math.min(q, Math.max(1, data.energy_drink)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      applyCounts(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o inventário.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [applyCounts]);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setQuantity(1);
    if (stats) {
      applyCounts({
        energy_drink: stats.energy_drink_count ?? 0,
        route_drink: stats.route_drink_count ?? 0,
        bau_patrulha: stats.patrol_cache_count ?? 0,
        stack_cap: INVENTORY_STACK_CAP,
      });
    }
    void load();
  }, [open, load, stats, applyCounts]);

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
      applyCounts(res.inventario);
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

  const openExploration = () => {
    onClose();
    window.dispatchEvent(new Event('abdoria:open-afk'));
  };

  const totalItems = energyCount + routeCount + bauCount;

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
        <p className="game-modal__text">
          Energy Drink e Route Drink acumulam até {stackCap} unidades. Excedentes viram Dorias.
        </p>

        <div className="game-inventory-grid">
          <button
            type="button"
            className={`game-inventory-slot${energyCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'energy_drink' ? ' game-inventory-slot--active' : ''}`}
            disabled={loading}
            onClick={() => {
              setSelected('energy_drink');
              setQuantity(Math.min(1, energyCount) || 1);
            }}
            aria-label={`Energy Drink, ${energyCount} em estoque`}
          >
            <span className="game-inventory-slot__icon">
              <EnergyDrinkIcon size={36} />
            </span>
            {energyCount > 0 && <span className="game-inventory-slot__qty tabular-nums">{energyCount}</span>}
          </button>

          <button
            type="button"
            className={`game-inventory-slot${routeCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'route_drink' ? ' game-inventory-slot--active' : ''}`}
            disabled={loading}
            onClick={() => setSelected('route_drink')}
            aria-label={`${ROUTE_DRINK_LABEL}, ${routeCount} em estoque`}
          >
            <span className="game-inventory-slot__icon">
              <RouteDrinkIcon size={36} />
            </span>
            {routeCount > 0 && <span className="game-inventory-slot__qty tabular-nums">{routeCount}</span>}
          </button>

          <button
            type="button"
            className={`game-inventory-slot${bauCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'bau_patrulha' ? ' game-inventory-slot--active' : ''}`}
            disabled={loading}
            onClick={() => setSelected('bau_patrulha')}
            aria-label={`${PATROL_CACHE_LABEL}, ${bauCount} em estoque`}
          >
            <span className="game-inventory-slot__icon">
              <PatrolCacheIcon size={36} />
            </span>
            {bauCount > 0 && <span className="game-inventory-slot__qty tabular-nums">{bauCount}</span>}
          </button>
        </div>

        {totalItems < 1 && !loading && (
          <p className="game-inventory-empty">Nenhum item consumível no inventário.</p>
        )}

        <AnimatePresence>
          {selected === 'energy_drink' && energyCount > 0 && (
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
                <GameButton onClick={() => void handleUseEnergy()} disabled={usingEnergy}>
                  {usingEnergy ? 'Usando...' : 'Usar'}
                </GameButton>
              </div>
            </motion.div>
          )}

          {selected === 'route_drink' && routeCount > 0 && (
            <motion.div
              className="game-inventory-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h3 className="game-inventory-detail__title">{ROUTE_DRINK_LABEL}</h3>
              <p className="game-inventory-detail__desc">
                Enche o baú com recompensas de {ROUTE_DRINK_HOURS}h de Exploração AFK. Só pode ser usado na exploração
                com o baú vazio.
              </p>
              <div className="game-inventory-detail__actions">
                <GameButton variant="secondary" onClick={() => setSelected(null)}>
                  Voltar
                </GameButton>
                <GameButton onClick={openExploration}>
                  <Compass size={16} aria-hidden /> Ir para Exploração
                </GameButton>
              </div>
            </motion.div>
          )}

          {selected === 'bau_patrulha' && bauCount > 0 && (
            <motion.div
              className="game-inventory-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h3 className="game-inventory-detail__title">{PATROL_CACHE_LABEL}</h3>
              <p className="game-inventory-detail__desc">
                Aplica instantaneamente as recompensas de 6h de exploração. Use pela tela de Exploração ou aqui em breve.
              </p>
              <div className="game-inventory-detail__actions">
                <GameButton variant="secondary" onClick={() => setSelected(null)}>
                  Voltar
                </GameButton>
                <GameButton onClick={openExploration}>
                  <Compass size={16} aria-hidden /> Ir para Exploração
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
