import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AfkRewardGrid } from '@/components/afk/AfkRewardGrid';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { buildAfkRewardItems } from '@/lib/afk-rewards';
import { playChestOpening, playChestRarity, type ChestRewardRarity } from '@/lib/sounds';
import { useAuth } from '@/context/AuthContext';
import { resolveCosmeticos, type AfkPendingReward } from '@/types';

interface Props {
  claimed: AfkPendingReward;
  onClose: () => void;
}

type ChestPhase = 'closed' | 'shaking' | 'charged' | 'opening' | 'open';

/** Vibração curta no celular — reforço físico do "pop" do baú. */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export function AfkRewardCelebration({ claimed, onClose }: Props) {
  const { user } = useAuth();
  const effectId = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp).efeito_equipado;
  const [phase, setPhase] = useState<ChestPhase>('closed');
  const items = useMemo(() => buildAfkRewardItems(claimed), [claimed]);
  const [revealIndex, setRevealIndex] = useState(0);
  const quickReveal = user?.preferencias?.baus_abertura_rapida ?? false;
  const playedRarityRef = useRef(new Set<string>());

  // O tier mais alto governa a apresentação visual e sonora da abertura.
  const tier = useMemo(() => {
    if (items.some((i) => i.rarity === 'secret' || i.rarity === 'golden_secret')) return 'secret';
    if (items.some((i) => i.rarity === 'mitico')) return 'mitico';
    if (items.some((i) => i.rarity === 'lendario')) return 'lendario';
    return null;
  }, [items]);

  const handleBackdropClick = () => {
    if (phase !== 'open') return;
    if (revealIndex < items.length) {
      setRevealIndex((value) => value + 1);
      return;
    }
    onClose();
  };

  useEffect(() => {
    playedRarityRef.current.clear();
    setPhase('closed');
    setRevealIndex(quickReveal ? items.length : 0);
    const shakeAt = quickReveal ? 100 : 350;
    const chargeAt = quickReveal ? 400 : 3300;
    const openAt = quickReveal ? 700 : 4200;
    const revealAt = quickReveal ? 1100 : 5000;

    const timers = [
      window.setTimeout(() => setPhase('shaking'), shakeAt),
      window.setTimeout(() => {
        setPhase('charged');
        vibrate(tier ? [18, 60, 18, 60, 30] : 18);
      }, chargeAt),
      window.setTimeout(() => {
        setPhase('opening');
        vibrate(tier ? 90 : 40);
        playChestOpening();
      }, openAt),
      window.setTimeout(() => setPhase('open'), revealAt),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [items.length, quickReveal, tier]);

  useEffect(() => {
    if (phase !== 'open') return;
    const item = quickReveal ? items[items.length - 1] : items[revealIndex];
    if (!item || playedRarityRef.current.has(item.key)) return;
    const rarity: ChestRewardRarity | null =
      item.rarity === 'lendario'
        ? 'lendario'
        : item.rarity === 'mitico'
          ? 'mitico'
          : item.rarity === 'secret' || item.rarity === 'golden_secret'
            ? 'secret'
            : null;
    if (!rarity) return;
    playedRarityRef.current.add(item.key);
    playChestRarity(rarity);
  }, [items, phase, quickReveal, revealIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="game-daily-reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="afk-reward-title"
      onClick={handleBackdropClick}
    >
      <CosmeticEffectLayer effectId={effectId} mode="burst" />

      {/* Clarão em tela cheia no instante da abertura, na cor do melhor item —
          o "pop" que faz o jogador registrar que veio algo grande. */}
      <AnimatePresence>
        {tier && (phase === 'opening' || phase === 'open') && (
          <motion.div
            key="tier-flash"
            className={`game-afk-tier-flash game-afk-tier-flash--${tier}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.div
        className="game-daily-reward-card game-daily-reward-card--raro game-afk-celebration-card"
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
      >
        <h2 id="afk-reward-title" className="sr-only">
          Recompensas da exploração coletadas
        </h2>

        <AnimatePresence>
          {tier && phase === 'open' && (
            <motion.p
              key="tier-banner"
              className={`game-afk-tier-banner game-afk-tier-banner--${tier}`}
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              role="status"
            >
              {tier === 'secret' ? 'SECRET!' : tier === 'mitico' ? 'MÍTICO!' : 'LENDÁRIO!'}
            </motion.p>
          )}
        </AnimatePresence>

        <AfkRewardGrid
          pending={claimed}
          withChest
          chestCelebrate
          chestShaking={phase === 'shaking'}
          chestCharged={phase === 'charged'}
          chestOpen={phase === 'open'}
          chestOpening={phase === 'opening'}
          revealIndex={phase === 'open' ? revealIndex : undefined}
        />

        {phase === 'open' ? (
          <p className="game-afk-celebration-hint">
            {revealIndex < items.length
              ? 'Toque para revelar o próximo item'
              : quickReveal
                ? 'Abertura rápida concluída · toque fora de um item para fechar'
                : 'Todos os itens · toque fora de um item para fechar'}
          </p>
        ) : null}
      </motion.div>
    </div>,
    document.body,
  );
}
