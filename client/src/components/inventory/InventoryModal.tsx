import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { AfkRewardCelebration } from '@/components/afk/AfkRewardCelebration';
import { RouteDrinkSuggestModal } from '@/components/afk/RouteDrinkSuggestModal';
import { GameButton } from '@/components/ui/GameButton';
import {
  FrozenStreakIcon,
  RouteDrinkIcon,
  ExpInstantIcon,
  DoriaBagIcon,
} from '@/lib/item-icons';
import {
  getInventory,
  consumeExpInstant,
  consumeDoriaBag,
  consumeRouteDrink,
  updateMe,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import {
  buildRewardPresentationFromAfk,
  partitionRewardPresentation,
} from '@/lib/reward-presentation';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { useRewardPresentation } from '@/context/RewardPresentationContext';
import { emitXpEarned } from '@/lib/xp-orbs';
import type { AfkPendingReward } from '@/types';
import {
  CURRENCY_NAME,
  FROZEN_STREAK_LABEL,
  formatFrozenStreakDescription,
  DORIA_BAG_LABEL,
  DORIA_BAG_MAX,
  DORIA_BAG_MIN,
  EXP_INSTANT_LABEL,
  EXP_INSTANT_XP,
  INVENTORY_STACK_CAP,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_LABEL,
} from '@/types';
import '@/components/rewards/reward-presentation.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Sobrepõe modais da exploração (z-index maior). */
  layer?: 'default' | 'modal';
}

type SelectedItem = 'frozen_streak' | 'route_drink' | 'exp_instant' | 'doria_bag' | null;

export function InventoryModal({ open, onClose, layer = 'default' }: Props) {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const { presentRewards } = useRewardPresentation();
  const [frozenStreakCount, setFrozenStreakCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [expInstantCount, setExpInstantCount] = useState(0);
  const [doriaBagCount, setDoriaBagCount] = useState(0);
  const [stackCap, setStackCap] = useState(INVENTORY_STACK_CAP);
  const [loading, setLoading] = useState(false);
  const [usingExpInstant, setUsingExpInstant] = useState(false);
  const [usingDoriaBag, setUsingDoriaBag] = useState(false);
  const [usingRouteDrink, setUsingRouteDrink] = useState(false);
  const [routeDrinkConfirmOpen, setRouteDrinkConfirmOpen] = useState(false);
  const [celebrationClaimed, setCelebrationClaimed] = useState<AfkPendingReward | null>(null);
  const [bagShake, setBagShake] = useState(false);
  const [coinPops, setCoinPops] = useState<number[]>([]);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [togglingAutoUse, setTogglingAutoUse] = useState(false);
  const expInstantSlotRef = useRef<HTMLButtonElement | null>(null);

  const applyCounts = useCallback(
    (data: {
      frozen_streak: number;
      route_drink: number;
      exp_instant?: number;
      doria_bag?: number;
      stack_cap?: number;
    }) => {
      setFrozenStreakCount(data.frozen_streak);
      setRouteCount(data.route_drink);
      setExpInstantCount(data.exp_instant ?? 0);
      setDoriaBagCount(data.doria_bag ?? 0);
      setStackCap(data.stack_cap ?? INVENTORY_STACK_CAP);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      applyCounts(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o inventário.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [applyCounts]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setRouteDrinkConfirmOpen(false);
      setCelebrationClaimed(null);
      return;
    }
    setSelected(null);
    if (stats) {
      applyCounts({
        frozen_streak: stats.frozen_streak_count ?? 0,
        route_drink: stats.route_drink_count ?? 0,
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

  const handleUseExpInstantAll = async () => {
    if (expInstantCount < 1) return;
    setUsingExpInstant(true);
    try {
      const res = await consumeExpInstant(true);
      applyUser(res.user);
      await refreshApp();
      applyCounts(res.inventario);
      emitXpEarned(res.xp_ganho, expInstantSlotRef.current);
      showGameToast(`+${res.xp_ganho} XP instantâneo!`, { variant: 'success' });
      setSelected(null);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar EXP Instantâneo.'), {
        variant: 'error',
      });
    } finally {
      setUsingExpInstant(false);
    }
  };

  const handleUseDoriaBag = async (bagQuantity = 1, useAll = false) => {
    if (doriaBagCount < 1 || (!useAll && bagQuantity < 1)) return;
    setUsingDoriaBag(true);
    setBagShake(true);
    try {
      const res = await consumeDoriaBag(bagQuantity, useAll);
      applyUser(res.user);
      await refreshApp();
      applyCounts(res.inventario);
      setCoinPops(res.rolls.slice(0, 8));
      window.setTimeout(() => setCoinPops([]), 800);
      const label =
        res.quantity_used > 1
          ? `${res.quantity_used} bolsas abertas · +${res.abdoria_ganha} ${CURRENCY_NAME}!`
          : `+${res.abdoria_ganha} ${CURRENCY_NAME} da bolsa!`;
      showGameToast(label, { variant: 'success' });
      setSelected(null);
    } catch (err) {
      showGameToast(getErrorMessage(err, `Não foi possível usar ${DORIA_BAG_LABEL}.`), {
        variant: 'error',
      });
    } finally {
      setUsingDoriaBag(false);
      window.setTimeout(() => setBagShake(false), 550);
    }
  };

  const showClaimedCelebration = useCallback((claimed: AfkPendingReward, overflowToDorias = 0) => {
    setCelebrationClaimed(claimed);
    const overflowMsg = overflowToastMessage(overflowToDorias);
    if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
  }, []);

  const handleCelebrationClose = useCallback(() => {
    setCelebrationClaimed((claimed) => {
      if (claimed) {
        const { secrets } = partitionRewardPresentation(buildRewardPresentationFromAfk(claimed));
        if (secrets.length > 0) {
          presentRewards(secrets);
        }
      }
      return null;
    });
  }, [presentRewards]);

  const frozenAutoUse = user?.preferencias?.frozen_streak_auto_usar ?? true;

  const handleToggleFrozenAutoUse = async () => {
    if (!user || togglingAutoUse) return;
    const next = !frozenAutoUse;
    setTogglingAutoUse(true);
    applyUser({ ...user, preferencias: { ...user.preferencias, frozen_streak_auto_usar: next } });
    try {
      const updated = await updateMe({
        preferencias: { ...user.preferencias, frozen_streak_auto_usar: next },
      });
      applyUser(updated);
    } catch (err) {
      applyUser(user);
      showGameToast(getErrorMessage(err, 'Não foi possível salvar a preferência.'), {
        variant: 'error',
      });
    } finally {
      setTogglingAutoUse(false);
    }
  };

  const handleUseRouteDrink = async () => {
    if (routeCount < 1) return;
    setUsingRouteDrink(true);
    try {
      const res = await consumeRouteDrink(true);
      applyUser(res.user);
      await refreshApp();
      applyCounts(res.inventario);
      setRouteDrinkConfirmOpen(false);
      setSelected(null);
      window.dispatchEvent(new CustomEvent('abdoria:afk-sync', { detail: res }));
      showClaimedCelebration(res.claimed, res.overflow_to_dorias ?? 0);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar o Route Drink.'), {
        variant: 'error',
      });
    } finally {
      setUsingRouteDrink(false);
    }
  };

  const totalItems = frozenStreakCount + routeCount + expInstantCount + doriaBagCount;

  if (!open) return null;

  return createPortal(
    <>
      <div
        className={`game-inventory-overlay${layer === 'modal' ? ' game-inventory-overlay--modal' : ''}`}
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
          <button
            type="button"
            className="game-modal__close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>

          <h2 id="inventory-title" className="game-modal__title">
            Inventário
          </h2>
          <p className="game-modal__text">
            Frozen Streak, Route Drink e EXP Instantâneo acumulam até {stackCap} unidades.
            Excedentes viram {CURRENCY_NAME}.
          </p>

          <div className="game-inventory-grid">
            <button
              type="button"
              className={`game-inventory-slot${frozenStreakCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'frozen_streak' ? ' game-inventory-slot--active' : ''}`}
              disabled={loading}
              onClick={() => setSelected((prev) => (prev === 'frozen_streak' ? null : 'frozen_streak'))}
              aria-label={`${FROZEN_STREAK_LABEL}, ${frozenStreakCount} em estoque`}
            >
              <span className="game-inventory-slot__icon">
                <FrozenStreakIcon size={36} />
              </span>
              {frozenStreakCount > 0 && (
                <span className="game-inventory-slot__qty tabular-nums">{frozenStreakCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`game-inventory-slot${routeCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'route_drink' ? ' game-inventory-slot--active' : ''}`}
              disabled={loading}
              onClick={() => setSelected((prev) => (prev === 'route_drink' ? null : 'route_drink'))}
              aria-label={`${ROUTE_DRINK_LABEL}, ${routeCount} em estoque`}
            >
              <span className="game-inventory-slot__icon">
                <RouteDrinkIcon size={36} />
              </span>
              {routeCount > 0 && (
                <span className="game-inventory-slot__qty tabular-nums">{routeCount}</span>
              )}
            </button>

            <button
              ref={expInstantSlotRef}
              type="button"
              className={`game-inventory-slot${expInstantCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'exp_instant' ? ' game-inventory-slot--active' : ''}`}
              disabled={loading}
              onClick={() => setSelected((prev) => (prev === 'exp_instant' ? null : 'exp_instant'))}
              aria-label={`${EXP_INSTANT_LABEL}, ${expInstantCount} em estoque`}
            >
              <span className="game-inventory-slot__icon">
                <ExpInstantIcon size={36} />
              </span>
              {expInstantCount > 0 && (
                <span className="game-inventory-slot__qty tabular-nums">{expInstantCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`game-inventory-slot${doriaBagCount < 1 ? ' game-inventory-slot--empty' : ''}${selected === 'doria_bag' ? ' game-inventory-slot--active' : ''}${bagShake ? ' reward-doria-bag-shake' : ''}`}
              disabled={loading}
              onClick={() => setSelected((prev) => (prev === 'doria_bag' ? null : 'doria_bag'))}
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
              {doriaBagCount > 0 && (
                <span className="game-inventory-slot__qty tabular-nums">{doriaBagCount}</span>
              )}
            </button>
          </div>

          {totalItems < 1 && !loading && (
            <p className="game-inventory-empty">Nenhum item consumível no inventário.</p>
          )}

          <AnimatePresence>
            {selected === 'frozen_streak' && frozenStreakCount > 0 && (
              <motion.div
                className="game-inventory-detail"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <h3 className="game-inventory-detail__title">{FROZEN_STREAK_LABEL}</h3>
                <p className="game-inventory-detail__desc">{formatFrozenStreakDescription()}</p>
                <p className="game-inventory-detail__desc game-inventory-detail__desc--muted">
                  {frozenAutoUse
                    ? 'Consumido automaticamente se você perder um dia de treino.'
                    : 'Uso automático desativado — o streak vai quebrar normalmente se você perder um dia.'}{' '}
                  Você tem {frozenStreakCount} em estoque (máx. {stackCap}).
                </p>
                <div className="game-inventory-detail__toggle-row">
                  <span className="game-inventory-detail__toggle-label">Uso automático</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={frozenAutoUse}
                    aria-label={frozenAutoUse ? 'Desativar uso automático' : 'Ativar uso automático'}
                    disabled={togglingAutoUse}
                    className={`library-equipment__switch${frozenAutoUse ? ' library-equipment__switch--on' : ''}`}
                    onClick={() => void handleToggleFrozenAutoUse()}
                  >
                    <span className="library-equipment__switch-thumb" aria-hidden />
                  </button>
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
                  Aplica na hora o loot de {ROUTE_DRINK_HOURS}h de Exploração por unidade — usar
                  todos rende {routeCount * ROUTE_DRINK_HOURS}h. Você tem {routeCount} em estoque
                  (máx. {stackCap}).
                </p>
                <div className="game-inventory-detail__actions">
                  <GameButton
                    onClick={() => setRouteDrinkConfirmOpen(true)}
                    disabled={usingRouteDrink}
                  >
                    {usingRouteDrink ? 'Usando...' : 'Usar Todos'}
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
                  Concede +{EXP_INSTANT_XP} XP imediatamente por unidade. Você tem {expInstantCount}{' '}
                  em estoque (máx. {stackCap}).
                </p>
                <div className="game-inventory-detail__actions">
                  <GameButton
                    onClick={() => void handleUseExpInstantAll()}
                    disabled={usingExpInstant}
                  >
                    {usingExpInstant
                      ? 'Usando...'
                      : `Utilizar Todos (+${expInstantCount * EXP_INSTANT_XP} XP)`}
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
                  Cada bolsa concede entre {DORIA_BAG_MIN} e {DORIA_BAG_MAX} {CURRENCY_NAME}{' '}
                  aleatórias. Você tem {doriaBagCount} em estoque.
                  {doriaBagCount > 1 && (
                    <>
                      {' '}
                      Abrir todas pode render de {doriaBagCount * DORIA_BAG_MIN} a{' '}
                      {doriaBagCount * DORIA_BAG_MAX} {CURRENCY_NAME}.
                    </>
                  )}
                </p>
                <div className="game-inventory-detail__actions">
                  <GameButton
                    onClick={() => void handleUseDoriaBag(doriaBagCount, true)}
                    disabled={usingDoriaBag}
                  >
                    {usingDoriaBag
                      ? 'Abrindo...'
                      : doriaBagCount > 1
                        ? `Utilizar todas (${doriaBagCount})`
                        : 'Usar bolsa'}
                  </GameButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <RouteDrinkSuggestModal
        open={routeDrinkConfirmOpen}
        routeDrinkCount={routeCount}
        using={usingRouteDrink}
        canUse={routeCount > 0}
        layer={layer}
        onConfirm={() => void handleUseRouteDrink()}
        onCancel={() => setRouteDrinkConfirmOpen(false)}
      />

      {celebrationClaimed && (
        <AfkRewardCelebration claimed={celebrationClaimed} onClose={handleCelebrationClose} />
      )}
    </>,
    document.body,
  );
}
