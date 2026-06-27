import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Store, X } from 'lucide-react';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { buildRewardPresentationFromAfk } from '@/lib/reward-presentation';
import { useRewardPresentation } from '@/context/RewardPresentationContext';
import { AfkRewardGrid } from '@/components/afk/AfkRewardGrid';
import { AfkTimerPanel } from '@/components/afk/AfkTimerPanel';
import { PatrolShopModal } from '@/components/afk/patrol-shop/PatrolShopModal';
import { GameButton } from '@/components/ui/GameButton';
import { claimAfkRewards, getAfkMeta, useRouteDrink, type AfkMetaResponse } from '@/lib/api';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import { mergeAfkCombatSnapshot } from '@/lib/afk-combat-merge';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { ArmaPreferida } from '@/types';
import { resolvePatrolArmas, ROUTE_DRINK_LABEL } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AfkPatrolModal({ open, onClose }: Props) {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [usingRouteDrink, setUsingRouteDrink] = useState(false);
  const { presentRewards } = useRewardPresentation();
  const [elapsedSinceSyncMin, setElapsedSinceSyncMin] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const loadedAtRef = useRef(0);
  const syncedMinutosRef = useRef<number | null>(null);

  const reconcileTimerFromServer = useCallback((serverMinutos: number) => {
    const prev = syncedMinutosRef.current;
    if (prev === null || serverMinutos !== prev) {
      syncedMinutosRef.current = serverMinutos;
      loadedAtRef.current = Date.now();
      setElapsedSinceSyncMin(0);
    }
  }, []);

  const weapon: ArmaPreferida =
    meta?.arma_preferida ?? user?.preferencias?.arma_preferida ?? 'arco';
  const patrolArmas = resolvePatrolArmas(user?.preferencias?.patrol_armas);
  const weaponId = weapon === 'arco' ? patrolArmas.arco_equipado : patrolArmas.espada_equipada;
  const userId = String(user?.id ?? 'guest');
  const routeDrinkCount = meta?.route_drink_count ?? stats?.route_drink_count ?? 0;
  const canUseRouteDrink = routeDrinkCount > 0 && !meta?.has_rewards;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAfkMeta();
      setMeta((prev) => ({
        ...data,
        combat: mergeAfkCombatSnapshot(prev?.combat, data.combat),
        route_drink_count: data.route_drink_count,
      }));
      reconcileTimerFromServer(data.minutos_acumulados);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a exploração.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [reconcileTimerFromServer]);

  useEffect(() => {
    if (!open) {
      syncedMinutosRef.current = null;
      setShopOpen(false);
      return;
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;

    const combatPoll = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(combatPoll);
  }, [open, load]);

  useEffect(() => {
    const onAfkSync = (event: Event) => {
      const detail = (event as CustomEvent<AfkMetaResponse & { ok?: boolean }>).detail;
      if (!detail) return;
      setMeta((prev) => ({
        ...(prev ?? ({} as AfkMetaResponse)),
        minutos_acumulados: detail.minutos_acumulados,
        pending: detail.pending,
        has_rewards: detail.has_rewards,
        kill_drop_chance: detail.kill_drop_chance ?? prev?.kill_drop_chance ?? 4,
        kill_drop_chances: detail.kill_drop_chances ?? prev?.kill_drop_chances,
        max_minutes: detail.max_minutes ?? prev?.max_minutes ?? 1440,
        capped: detail.capped ?? prev?.capped ?? false,
        arma_preferida: detail.arma_preferida ?? prev?.arma_preferida ?? 'arco',
        combat: mergeAfkCombatSnapshot(prev?.combat, detail.combat),
      }));
      reconcileTimerFromServer(detail.minutos_acumulados);
    };
    window.addEventListener('abdoria:afk-sync', onAfkSync);
    return () => window.removeEventListener('abdoria:afk-sync', onAfkSync);
  }, [reconcileTimerFromServer]);

  useEffect(() => {
    if (!open || meta?.capped) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSinceSyncMin((Date.now() - loadedAtRef.current) / 60_000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, meta?.capped]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (shopOpen) {
        setShopOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, shopOpen]);

  const handleClaim = async () => {
    if (!meta?.has_rewards) return;
    setClaiming(true);
    try {
      const res = await claimAfkRewards();
      applyUser(res.user);
      await refreshApp();
      presentRewards(buildRewardPresentationFromAfk(res.claimed));
      showGameToast('Recompensas da exploração coletadas!', { variant: 'success' });
      const overflowMsg = overflowToastMessage(res.overflow_to_dorias);
      if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível coletar recompensas.'), { variant: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleUseRouteDrink = async () => {
    if (!canUseRouteDrink) return;
    setUsingRouteDrink(true);
    try {
      const res = await useRouteDrink();
      applyUser(res.user);
      await refreshApp();
      setMeta({
        minutos_acumulados: res.minutos_acumulados,
        pending: res.pending,
        has_rewards: res.has_rewards,
        kill_drop_chance: res.kill_drop_chance,
        kill_drop_chances: res.kill_drop_chances,
        max_minutes: res.max_minutes,
        capped: res.capped,
        combat: res.combat,
        arma_preferida: res.arma_preferida ?? weapon,
        route_drink_count: res.route_drink_count,
      });
      showGameToast(`${ROUTE_DRINK_LABEL} usado! Baú preenchido com 1h de loot.`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível usar o Route Drink.'), { variant: 'error' });
    } finally {
      setUsingRouteDrink(false);
    }
  };

  if (!open) return null;

  const capped = meta?.capped ?? false;

  return createPortal(
    <>
      <div className="game-afk-overlay" role="dialog" aria-modal="true" aria-labelledby="afk-patrol-title" onClick={onClose}>
        <motion.div
          className="game-afk-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="game-modal__close-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>

          <div className="game-afk-modal__header game-afk-modal__header--compact">
            <div className="game-afk-modal__header-main">
              <div className="game-afk-modal__title-icon" aria-hidden>
                <AfkFabSwords variant="header" />
              </div>
              <h2 id="afk-patrol-title" className="game-afk-modal__title">
                Exploração AFK
              </h2>
            </div>
            <button
              type="button"
              className="game-afk-modal__shop-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShopOpen(true);
              }}
              aria-label="Abrir loja da exploração"
            >
              <Store size={14} aria-hidden />
              Loja da Exploração
            </button>
          </div>

          <AfkCombatScene
            userId={userId}
            weapon={weapon}
            weaponId={weaponId}
            combat={meta?.combat ?? null}
            hasLoot={meta?.has_rewards}
            capped={capped}
          />

          <AfkTimerPanel
            minutos={meta?.minutos_acumulados ?? 0}
            elapsedSinceSyncMin={elapsedSinceSyncMin}
            capped={capped}
            loading={loading}
            dropChances={meta?.kill_drop_chances}
          />

          <AfkRewardGrid pending={meta?.pending} withChest />

          <div className="game-afk-modal__footer">
            {routeDrinkCount > 0 && (
              <GameButton
                variant="secondary"
                className="game-afk-route-drink-btn"
                size="lg"
                disabled={!canUseRouteDrink || usingRouteDrink || loading || claiming}
                onClick={() => void handleUseRouteDrink()}
              >
                {usingRouteDrink ? 'Usando...' : `Usar ${ROUTE_DRINK_LABEL}`}
              </GameButton>
            )}
            <GameButton
              className={`game-afk-claim-btn${meta?.has_rewards ? ' game-afk-claim-btn--ready' : ''}`}
              size="lg"
              disabled={!meta?.has_rewards || claiming || loading}
              onClick={() => void handleClaim()}
              aria-label={
                claiming
                  ? 'Coletando recompensas'
                  : meta?.has_rewards
                    ? 'Coletar recompensas da exploração'
                    : 'Nenhuma recompensa para coletar'
              }
            >
              {claiming ? 'Coletando...' : 'Coletar'}
            </GameButton>
          </div>
        </motion.div>
      </div>

      <PatrolShopModal
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        onWeaponChange={() => {
          void load();
        }}
      />
    </>,
    document.body,
  );
}
