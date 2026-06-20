import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Binoculars, Coins, Gift, Sparkles, Sword, X, Zap } from 'lucide-react';
import { AfkRewardCelebration } from '@/components/afk/AfkRewardCelebration';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon } from '@/lib/daily-shop-display';
import { claimAfkRewards, getAfkMeta, type AfkMetaResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { CURRENCY_NAME, type AfkPendingReward } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ENEMIES = ['bat', 'zombie', 'skeleton'] as const;

function formatAfkTimer(minutos: number): string {
  const totalSec = Math.floor(minutos * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function shuffleEnemies(): typeof ENEMIES[number][] {
  const list = [...ENEMIES];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function AfkPatrolModal({ open, onClose }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<AfkPendingReward | null>(null);
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const baseMinutesRef = useRef(0);
  const loadedAtRef = useRef(Date.now());
  const [enemyOrder] = useState(() => shuffleEnemies());
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [attackTick, setAttackTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAfkMeta();
      setMeta(data);
      baseMinutesRef.current = data.minutos_acumulados;
      loadedAtRef.current = Date.now();
      setDisplayMinutes(data.minutos_acumulados);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar a patrulha.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    const onAfkSync = (event: Event) => {
      const detail = (event as CustomEvent<{ minutos_acumulados: number; pending: AfkPendingReward; has_rewards: boolean }>).detail;
      if (!detail) return;
      baseMinutesRef.current = detail.minutos_acumulados;
      loadedAtRef.current = Date.now();
      setDisplayMinutes(detail.minutos_acumulados);
      setMeta((prev) => (prev ? { ...prev, ...detail } : prev));
    };
    window.addEventListener('abdoria:afk-sync', onAfkSync);
    return () => window.removeEventListener('abdoria:afk-sync', onAfkSync);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => {
      const elapsedMin = (Date.now() - loadedAtRef.current) / 60_000;
      setDisplayMinutes(baseMinutesRef.current + elapsedMin);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const enemyTimer = window.setInterval(() => {
      setEnemyIndex((i) => (i + 1) % enemyOrder.length);
    }, 2800);
    const attackTimer = window.setInterval(() => {
      setAttackTick((t) => t + 1);
    }, 600);
    return () => {
      window.clearInterval(enemyTimer);
      window.clearInterval(attackTimer);
    };
  }, [open, enemyOrder.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const rewards = useMemo(() => {
    if (!meta?.pending) return [];
    const p = meta.pending;
    const cosmeticIds = p.cosmetic_ids ?? [];
    const items: { key: string; label: string; icon: React.ReactNode; secret?: boolean }[] = [];
    if (p.xp > 0) items.push({ key: 'xp', label: `+${p.xp} XP`, icon: <Zap size={18} /> });
    if (p.abdoria > 0) items.push({ key: 'abdoria', label: `+${p.abdoria} ${CURRENCY_NAME}`, icon: <Coins size={18} /> });
    if (p.energy_drinks > 0) {
      items.push({
        key: 'drink',
        label: `+${p.energy_drinks} Energy Drink`,
        icon: <EnergyDrinkIcon size={18} />,
      });
    }
    cosmeticIds.forEach((id) => {
      items.push({
        key: id,
        label: COSMETIC_BY_ID[id]?.nome ?? id,
        icon: <Gift size={18} />,
      });
    });
    if (p.titulo_secreto) {
      items.push({
        key: 'titulo_secreto',
        label: COSMETIC_BY_ID.titulo_secreto?.nome ?? 'Título secreto',
        icon: <Sparkles size={18} />,
        secret: true,
      });
    }
    return items;
  }, [meta?.pending]);

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

  const weapon = meta?.arma_preferida ?? 'arco';
  const currentEnemy = enemyOrder[enemyIndex];
  const attacking = attackTick % 2 === 0;

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
            <Binoculars size={16} aria-hidden />
            <h2 id="afk-patrol-title" className="game-modal__title !mb-0">
              Patrulha AFK
            </h2>
          </div>
          <p className="game-modal__text">Seu herói defende Abdoria enquanto você está fora. Recompensas a cada 30 min.</p>

          <div className="game-afk-scene">
            <div className="game-afk-scene__viewport">
              <div className="game-afk-scene__sky" aria-hidden />
              <div className="game-afk-scene__ground" aria-hidden />

              <div className={`game-afk-hero game-afk-hero--${weapon}${attacking ? ' game-afk-hero--attack' : ''}`} aria-hidden>
                <div className="game-afk-hero__body" />
                {weapon === 'arco' ? (
                  <svg className="game-afk-bow" viewBox="0 0 64 40" aria-hidden>
                    <path d="M4 20 Q32 2 60 20" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="4" y1="20" x2="60" y2="20" stroke="#a16207" strokeWidth="1.5" />
                    {attacking && (
                      <motion.line
                        x1="8"
                        y1="20"
                        x2="58"
                        y2="20"
                        stroke="#57534e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.35 }}
                      />
                    )}
                  </svg>
                ) : (
                  <Sword className="game-afk-hero__sword" size={20} />
                )}
              </div>

              <div className={`game-afk-enemy game-afk-enemy--${currentEnemy}${attacking ? ' game-afk-enemy--hit' : ''}`} aria-hidden>
                <div className="game-afk-enemy__sprite" />
              </div>
            </div>
          </div>

          <div className="game-afk-timer" aria-live="polite">
            <span className="game-afk-timer__label">Tempo acumulado</span>
            <span className="game-afk-timer__value tabular-nums">
              {loading ? '--:--:--' : formatAfkTimer(displayMinutes)}
            </span>
          </div>

          <div className="game-afk-rewards">
            <p className="game-afk-rewards__title">Recompensas pendentes</p>
            {rewards.length === 0 ? (
              <p className="game-afk-rewards__empty">Patrulhe mais para acumular loot!</p>
            ) : (
              <div className="game-afk-rewards__grid">
                {rewards.map((reward) => (
                  <div
                    key={reward.key}
                    className={`game-afk-reward${reward.secret ? ' game-afk-reward--secret' : ''}`}
                  >
                    <span className="game-afk-reward__icon">{reward.icon}</span>
                    <span className={`game-afk-reward__label${reward.secret ? ' cosmetic-title--secreto' : ''}`}>
                      {reward.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="game-login__error mt-2">{error}</p>}

          <GameButton
            className="w-full mt-3"
            size="lg"
            disabled={!meta?.has_rewards || claiming || loading}
            onClick={() => void handleClaim()}
          >
            {claiming ? 'Coletando...' : meta?.has_rewards ? 'Coletar recompensas' : 'Nada para coletar'}
          </GameButton>
        </motion.div>
      </div>

      {celebration && <AfkRewardCelebration claimed={celebration} onClose={() => setCelebration(null)} />}
    </>,
    document.body,
  );
}
