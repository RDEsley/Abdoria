import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkRewardCelebration } from '@/components/afk/AfkRewardCelebration';
import { AfkRewardGrid, countAfkRewardItems } from '@/components/afk/AfkRewardGrid';
import { AfkTimerPanel } from '@/components/afk/AfkTimerPanel';
import { AfkWeaponToggle } from '@/components/afk/AfkWeaponToggle';
import { GameButton } from '@/components/ui/GameButton';
import { claimAfkRewards, getAfkMeta, type AfkMetaResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward, ArmaPreferida } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AfkPatrolModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  const [weapon, setWeapon] = useState<ArmaPreferida>('arco');
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<AfkPendingReward | null>(null);
  const [elapsedSinceSyncMin, setElapsedSinceSyncMin] = useState(0);
  const loadedAtRef = useRef(0);

  const applyMeta = useCallback((data: AfkMetaResponse) => {
    setMeta(data);
    setWeapon(data.arma_preferida ?? 'arco');
    loadedAtRef.current = Date.now();
    setElapsedSinceSyncMin(0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAfkMeta();
      applyMeta(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar a patrulha.'));
    } finally {
      setLoading(false);
    }
  }, [applyMeta]);

  useEffect(() => {
    if (!open) return;
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
        kill_drop_chance: detail.kill_drop_chance ?? prev?.kill_drop_chance ?? 10,
        max_minutes: detail.max_minutes ?? prev?.max_minutes ?? 1440,
        capped: detail.capped ?? prev?.capped ?? false,
        arma_preferida: prev?.arma_preferida ?? weapon,
        combat: detail.combat ?? prev?.combat,
      }));
      loadedAtRef.current = Date.now();
      setElapsedSinceSyncMin(0);
    };
    window.addEventListener('abdoria:afk-sync', onAfkSync);
    return () => window.removeEventListener('abdoria:afk-sync', onAfkSync);
  }, [weapon]);

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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleClaim = async () => {
    if (!meta?.has_rewards) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await claimAfkRewards();
      applyUser(res.user);
      await refreshApp();
      setCelebration(res.claimed);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível coletar recompensas.'));
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const rewardCount = countAfkRewardItems(meta?.pending);
  const capped = meta?.capped ?? false;
  const killDropChance = meta?.kill_drop_chance ?? 10;

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

          <div className="game-afk-modal__header">
            <div className="game-afk-modal__title-wrap">
              <p className="game-afk-modal__eyebrow">
                <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden />
                Modo offline
              </p>
              <h2 id="afk-patrol-title" className="game-afk-modal__title">
                Patrulha de Abdoria
              </h2>
              <p className="game-afk-modal__subtitle">
                Seu herói defende o reino enquanto você descansa. {killDropChance}% de loot por inimigo derrotado.
              </p>
            </div>
            <AfkWeaponToggle value={weapon} onChange={setWeapon} />
          </div>

          {capped && (
            <div className="game-afk-cap-banner" role="status">
              <AlertTriangle size={16} aria-hidden />
              Limite de 24h atingido — colete as recompensas para continuar patrulhando.
            </div>
          )}

          {meta?.combat?.is_boss && (
            <div className="game-afk-boss-banner" role="status">
              Boss em combate! Loot bônus ao derrotar.
            </div>
          )}

          <AfkCombatScene
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
          />

          <AfkRewardGrid pending={meta?.pending} />

          <div className="game-afk-modal__footer">
            {error && <p className="game-afk-modal__error">{error}</p>}

            <GameButton
              className={`game-afk-claim-btn${meta?.has_rewards ? ' game-afk-claim-btn--ready' : ''}`}
              size="lg"
              disabled={!meta?.has_rewards || claiming || loading}
              onClick={() => void handleClaim()}
            >
              {claiming
                ? 'Coletando...'
                : meta?.has_rewards
                  ? `Coletar ${rewardCount} recompensa${rewardCount === 1 ? '' : 's'}`
                  : 'Nada para coletar'}
            </GameButton>
          </div>
        </motion.div>
      </div>

      {celebration && <AfkRewardCelebration claimed={celebration} onClose={() => setCelebration(null)} />}
    </>,
    document.body,
  );
}
