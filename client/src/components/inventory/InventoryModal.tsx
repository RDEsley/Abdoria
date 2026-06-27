import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Minus, Plus, X, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon, PatrolCacheIcon, RouteDrinkIcon, ExpInstantIcon, DoriaBagIcon } from '@/lib/daily-shop-display';
import { getInventory, useEnergyDrink, useExpInstant, useDoriaBag } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import {
  ENERGY_DRINK_BONUS_XP,
  ENERGY_DRINK_LABEL,
  DORIA_BAG_LABEL,
  EXP_INSTANT_LABEL,
  EXP_INSTANT_XP,
  formatEnergyDrinkDescription,
  INVENTORY_STACK_CAP,
  PATROL_CACHE_LABEL,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_LABEL,
} from '@/types';
import '@/components/rewards/reward-presentation.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SelectedItem = 'energy_drink' | 'route_drink' | 'bau_patrulha' | 'exp_instant' | 'doria_bag' | null;

export function InventoryModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [energyCount, setEnergyCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [bauCount, setBauCount] = useState(0);
  const [expInstantCount, setExpInstantCount] = useState(0);
  const [doriaBagCount, setDoriaBagCount] = useState(0);
  const [stackCap, setStackCap] = useState(INVENTORY_STACK_CAP);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usingEnergy, setUsingEnergy] = useState(false);
  const [usingExpInstant, setUsingExpInstant] = useState(false);
  const [usingDoriaBag, setUsingDoriaBag] = useState(false);
  const [bagShake, setBagShake] = useState(false);
  const [coinPops, setCoinPops] = useState<number[]>([]);
  const [selected, setSelected] = useState<SelectedItem>(null);

  const applyCounts = useCallback((data: {
    energy_drink: number;
    route_drink: number;
    bau_patrulha: number;
    exp_instant?: number;
    doria_bag?: number;
    stack_cap?: number;
  }) => {
    setEnergyCount(data.energy_drink);
    setRouteCount(data.route_drink);
    setBauCount(data.bau_patrulha);
    setExpInstantCount(data.exp_instant ?? 0);
    setDoriaBagCount(data.doria_bag ?? 0);
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
        exp_instant: stats.exp_instant_count ?? 0,
        doria_bag: stats.doria_bag_count ?? 0,
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

  const handleUseExpInstantAll = async () => {
    if (expInstantCount < 1) return;
    setUsingExpInstant(true);
    try {
      const res = await useExpInstant(true);
      applyUser(res.user);
      await refreshApp();
      applyCounts(res.inventario);
      showGameToast(`+${res.xp_ganho} XP instantâneo!`, { variant: 'success' });
      setSelected(null);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar EXP Instantâneo.'), { variant: 'error' });
    } finally {
      setUsingExpInstant(false);
    }
  };

  const handleUseDoriaBag = async () => {
    if (doriaBagCount < 1) return;
    setUsingDoriaBag(true);
    setBagShake(true);
    try {
      const res = await useDoriaBag(1);
      applyUser(res.user);
      await refreshApp();
      applyCounts(res.inventario);
      setCoinPops(res.rolls);
      window.setTimeout(() => setCoinPops([]), 800);
      showGameToast(`+${res.abdoria_ganha} Dorias da bolsa!`, { variant: 'success' });
      setSelected(null);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar Bolsa de Dorias.'), { variant: 'error' });
    } finally {
      setUsingDoriaBag(false);
      window.setTimeout(() => setBagShake(false), 550);
    }
  };

  const openExploration = () => {
    onClose();
    window.dispatchEvent(new Event('abdoria:open-afk'));
  };

  const totalItems = energyCount + routeCount + bauCount + expInstantCount + doriaBagCount;

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
          Energy Drink, Route Drink e EXP Instantâneo acumulam até {stackCap} unidades. Excedentes viram Dorias.
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

          <button
            type="button"
            className={`game-inventory-slot${expInstantCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'exp_instant' ? ' game-inventory-slot--active' : ''}`}
            disabled={loading}
            onClick={() => setSelected('exp_instant')}
            aria-label={`${EXP_INSTANT_LABEL}, ${expInstantCount} em estoque`}
          >
            <span className="game-inventory-slot__icon">
              <ExpInstantIcon size={36} />
            </span>
            {expInstantCount > 0 && <span className="game-inventory-slot__qty tabular-nums">{expInstantCount}</span>}
          </button>

          <button
            type="button"
            className={`game-inventory-slot${doriaBagCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'doria_bag' ? ' game-inventory-slot--active' : ''}${bagShake ? ' reward-doria-bag-shake' : ''}`}
            disabled={loading}
            onClick={() => setSelected('doria_bag')}
            aria-label={`${DORIA_BAG_LABEL}, ${doriaBagCount} em estoque`}
          >
            <span className="game-inventory-slot__icon relative">
              <DoriaBagIcon size={36} />
              {coinPops.map((amount, index) => (
                <span
                  key={`${amount}-${index}`}
                  className="reward-doria-coin-pop"
                  style={{ left: `${20 + index * 18}%`, top: '10%' }}
                >
                  +{amount}
                </span>
              ))}
            </span>
            {doriaBagCount > 0 && <span className="game-inventory-slot__qty tabular-nums">{doriaBagCount}</span>}
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
              <h3 className="game-inventory-detail__title">{ENERGY_DRINK_LABEL}</h3>
              <p className="game-inventory-detail__desc">
                {formatEnergyDrinkDescription(ENERGY_DRINK_BONUS_XP)}
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
                  <Compass size={16} aria-hidden /> Usar na Exploração
                </GameButton>
              </div>
            </motion.div>
          )}

          {selected === 'exp_instant' && expInstantCount > 0 && (
            <motion.div
              className="game-inventory-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h3 className="game-inventory-detail__title">{EXP_INSTANT_LABEL}</h3>
              <p className="game-inventory-detail__desc">
                Concede +{EXP_INSTANT_XP} XP imediatamente por unidade. Você tem {expInstantCount} em estoque
                (máx. {stackCap}).
              </p>
              <div className="game-inventory-detail__actions">
                <GameButton variant="secondary" onClick={() => setSelected(null)} disabled={usingExpInstant}>
                  Voltar
                </GameButton>
                <GameButton onClick={() => void handleUseExpInstantAll()} disabled={usingExpInstant}>
                  {usingExpInstant ? 'Usando...' : `Utilizar Todos (+${expInstantCount * EXP_INSTANT_XP} XP)`}
                </GameButton>
              </div>
            </motion.div>
          )}

          {selected === 'doria_bag' && doriaBagCount > 0 && (
            <motion.div
              className="game-inventory-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h3 className="game-inventory-detail__title">{DORIA_BAG_LABEL}</h3>
              <p className="game-inventory-detail__desc">
                Abre uma bolsa misteriosa com 4 a 21 Dorias. Você tem {doriaBagCount} em estoque.
              </p>
              <div className="game-inventory-detail__actions">
                <GameButton variant="secondary" onClick={() => setSelected(null)} disabled={usingDoriaBag}>
                  Voltar
                </GameButton>
                <GameButton onClick={() => void handleUseDoriaBag()} disabled={usingDoriaBag}>
                  {usingDoriaBag ? 'Abrindo...' : 'Usar bolsa'}
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
                  <Compass size={16} aria-hidden /> Usar na Exploração
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
