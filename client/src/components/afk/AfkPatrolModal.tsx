import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Gift, Store, X } from 'lucide-react';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { AfkRewardCelebration } from '@/components/afk/AfkRewardCelebration';
import { AfkRewardGrid, countAfkRewardItems } from '@/components/afk/AfkRewardGrid';
import { AfkTimerPanel } from '@/components/afk/AfkTimerPanel';
import { PatrolShopModal } from '@/components/afk/patrol-shop/PatrolShopModal';
import { GameButton } from '@/components/ui/GameButton';
import { claimAfkRewards, getAfkMeta, type AfkMetaResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward, ArmaPreferida } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AfkPatrolModal({ open, onClose }: Props) {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [celebration, setCelebration] = useState<AfkPendingReward | null>(null);
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
  const userId = String(user?.id ?? 'guest');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAfkMeta();
      setMeta((prev) => {
        const serverAhead =
          data.combat &&
          (data.combat.kills_total > (prev?.combat?.kills_total ?? 0) || !prev?.combat);
        return {
          ...data,
          combat: serverAhead ? data.combat : (prev?.combat ?? data.combat),
        };
      });
      reconcileTimerFromServer(data.minutos_acumulados);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a patrulha.'), { variant: 'error' });
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
      setMeta((prev) => {
        const serverAhead =
          detail.combat &&
          (detail.combat.kills_total > (prev?.combat?.kills_total ?? 0) || !prev?.combat);
        return {
          ...(prev ?? ({} as AfkMetaResponse)),
          minutos_acumulados: detail.minutos_acumulados,
          pending: detail.pending,
          has_rewards: detail.has_rewards,
          kill_drop_chance: detail.kill_drop_chance ?? prev?.kill_drop_chance ?? 4,
          kill_drop_chances: detail.kill_drop_chances ?? prev?.kill_drop_chances,
          max_minutes: detail.max_minutes ?? prev?.max_minutes ?? 1440,
          capped: detail.capped ?? prev?.capped ?? false,
          arma_preferida: prev?.arma_preferida ?? detail.arma_preferida ?? 'arco',
          combat: serverAhead ? detail.combat : (prev?.combat ?? detail.combat),
        };
      });
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
      setCelebration(res.claimed);
      showGameToast('Recompensas da patrulha coletadas!', { variant: 'success' });
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível coletar recompensas.'), { variant: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const rewardCount = countAfkRewardItems(meta?.pending);
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
                Patrulha
              </h2>
            </div>
            <button
              type="button"
              className="game-afk-modal__shop-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShopOpen(true);
              }}
              aria-label="Abrir loja da patrulha"
            >
              <Store size={14} aria-hidden />
              Loja da Patrulha
            </button>
          </div>

          <AfkCombatScene
            userId={userId}
            weapon={weapon}
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
            <GameButton
              className={`game-afk-claim-btn${meta?.has_rewards ? ' game-afk-claim-btn--ready' : ''}`}
              size="lg"
              disabled={!meta?.has_rewards || claiming || loading}
              onClick={() => void handleClaim()}
              aria-label={
                claiming
                  ? 'Coletando recompensas'
                  : meta?.has_rewards
                    ? `Coletar recompensas — ${rewardCount} tipo${rewardCount === 1 ? '' : 's'}`
                    : 'Nenhuma recompensa para coletar'
              }
            >
              {claiming ? (
                'Coletando...'
              ) : (
                <span className="game-afk-claim-btn__content">
                  <Gift size={18} aria-hidden />
                  <span>Coletar</span>
                  {meta?.has_rewards && rewardCount > 0 ? (
                    <span className="game-afk-claim-btn__badge tabular-nums">{rewardCount}</span>
                  ) : null}
                </span>
              )}
            </GameButton>
          </div>
        </motion.div>
      </div>

      {celebration && <AfkRewardCelebration claimed={celebration} onClose={() => setCelebration(null)} />}

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
