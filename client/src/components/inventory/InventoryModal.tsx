import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, X, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon, PatrolCacheIcon, formatPatrolCacheDescription } from '@/lib/daily-shop-display';
import { getInventory, useEnergyDrink, usePatrolCache } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward } from '@/types';
import { CURRENCY_NAME, ENERGY_DRINK_BONUS_XP, PATROL_CACHE_LABEL } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatClaimedSummary(claimed: AfkPendingReward): string {
  const parts: string[] = [];
  if (claimed.xp > 0) parts.push(`+${claimed.xp} XP`);
  if (claimed.abdoria > 0) parts.push(`+${claimed.abdoria} ${CURRENCY_NAME}`);
  if (claimed.energy_drinks > 0) parts.push(`+${claimed.energy_drinks} Energy Drink`);
  if (claimed.cosmetic_ids.length > 0) parts.push(`${claimed.cosmetic_ids.length} cosmético(s)`);
  if (claimed.titulo_secreto) parts.push('Título secreto!');
  return parts.length > 0 ? parts.join(' · ') : 'Nenhuma recompensa desta vez.';
}

export function InventoryModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [energyCount, setEnergyCount] = useState(0);
  const [patrolCount, setPatrolCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usingEnergy, setUsingEnergy] = useState(false);
  const [usingPatrol, setUsingPatrol] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventory();
      setEnergyCount(data.energy_drink);
      setPatrolCount(data.bau_patrulha);
      setQuantity((q) => Math.min(q, Math.max(1, data.energy_drink)));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar o inventário.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSuccess(null);
    setQuantity(1);
    if (stats?.energy_drink_count !== undefined) {
      setEnergyCount(stats.energy_drink_count);
    }
    if (stats?.patrol_cache_count !== undefined) {
      setPatrolCount(stats.patrol_cache_count);
    }
    void load();
  }, [open, load, stats?.energy_drink_count, stats?.patrol_cache_count]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleUseEnergy = async () => {
    if (quantity < 1 || quantity > energyCount) return;
    setUsingEnergy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await useEnergyDrink(quantity);
      applyUser(res.user);
      await refreshApp();
      setEnergyCount(res.inventario.energy_drink);
      setPatrolCount(res.inventario.bau_patrulha);
      setQuantity(Math.min(quantity, Math.max(1, res.inventario.energy_drink)));
      setSuccess(`+${res.bonus_added} XP bônus ativado! (${ENERGY_DRINK_BONUS_XP} XP por drink)`);
      window.dispatchEvent(
        new CustomEvent('abdoria:energy-drink-used', { detail: { bonus_added: res.bonus_added } }),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível usar Energy Drink.'));
    } finally {
      setUsingEnergy(false);
    }
  };

  const handleUsePatrol = async () => {
    if (patrolCount < 1) return;
    setUsingPatrol(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await usePatrolCache();
      applyUser(res.user);
      await refreshApp();
      setEnergyCount(res.inventario.energy_drink);
      setPatrolCount(res.inventario.bau_patrulha);
      setSuccess(`${PATROL_CACHE_LABEL} aberto! ${formatClaimedSummary(res.claimed)}`);
    } catch (err) {
      setError(getErrorMessage(err, `Não foi possível usar ${PATROL_CACHE_LABEL}.`));
    } finally {
      setUsingPatrol(false);
    }
  };

  const busy = usingEnergy || usingPatrol;

  if (!open) return null;

  return createPortal(
    <div className="game-inventory-overlay" role="dialog" aria-modal="true" aria-labelledby="inventory-title" onClick={onClose}>
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
        <p className="game-modal__text">Itens consumíveis do herói.</p>

        <article className="game-inventory-item">
          <div className="game-inventory-item__icon">
            <EnergyDrinkIcon size={32} />
          </div>
          <div className="game-inventory-item__info">
            <h3 className="game-inventory-item__name">Energy Drink</h3>
            <p className="game-inventory-item__desc">
              +{ENERGY_DRINK_BONUS_XP} XP bônus por unidade — não conta no teto diário.
            </p>
            <p className="game-inventory-item__count">
              Em estoque: <strong>{loading ? '…' : energyCount}</strong>
            </p>
          </div>
        </article>

        {energyCount > 0 && (
          <div className="game-inventory-use">
            <span className="game-inventory-use__label">Quantidade</span>
            <div className="game-inventory-use__stepper">
              <button
                type="button"
                className="game-inventory-use__btn"
                disabled={quantity <= 1 || busy}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
              >
                <Minus size={16} />
              </button>
              <span className="game-inventory-use__value tabular-nums">{quantity}</span>
              <button
                type="button"
                className="game-inventory-use__btn"
                disabled={quantity >= energyCount || busy}
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
        )}

        <GameButton
          className="w-full mt-3"
          size="lg"
          disabled={energyCount < 1 || busy || loading}
          onClick={() => void handleUseEnergy()}
        >
          {usingEnergy ? 'Usando...' : 'Usar Energy Drink'}
        </GameButton>

        <article className="game-inventory-item mt-4">
          <div className="game-inventory-item__icon">
            <PatrolCacheIcon size={32} />
          </div>
          <div className="game-inventory-item__info">
            <h3 className="game-inventory-item__name">{PATROL_CACHE_LABEL}</h3>
            <p className="game-inventory-item__desc">{formatPatrolCacheDescription()}</p>
            <p className="game-inventory-item__count">
              Em estoque: <strong>{loading ? '…' : patrolCount}</strong>
            </p>
          </div>
        </article>

        <GameButton
          className="w-full mt-3"
          size="lg"
          variant="secondary"
          disabled={patrolCount < 1 || busy || loading}
          onClick={() => void handleUsePatrol()}
        >
          {usingPatrol ? 'Abrindo...' : `Usar ${PATROL_CACHE_LABEL}`}
        </GameButton>

        {error && <p className="game-login__error mt-2">{error}</p>}
        {success && <p className="game-modal__success mt-2">{success}</p>}
      </motion.div>
    </div>,
    document.body,
  );
}
