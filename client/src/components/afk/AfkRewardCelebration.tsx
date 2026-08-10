import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AfkRewardGrid } from '@/components/afk/AfkRewardGrid';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { buildAfkRewardItems } from '@/lib/afk-rewards';
import { playLevelUp, playUnlock } from '@/lib/sounds';
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

  // Quanto melhor o loot, MAIS LONGO o build-up: a espera extra é o que dá
  // valor ao prêmio (mesma lógica de caixa de loot de jogo — abrir rápido
  // demais mata a expectativa). O jogador aprende que tremor longo = coisa boa.
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
      playUnlock();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const extra =
      tier === 'secret' ? 1400 : tier === 'mitico' ? 900 : tier === 'lendario' ? 450 : 0;
    const shakeAt = 200;
    const chargeAt = 1700 + extra;
    const openAt = chargeAt + 400;
    const revealAt = openAt + 600;

    const timers = [
      window.setTimeout(() => setPhase('shaking'), shakeAt),
      window.setTimeout(() => {
        setPhase('charged');
        vibrate(tier ? [18, 60, 18, 60, 30] : 18);
      }, chargeAt),
      window.setTimeout(() => {
        setPhase('opening');
        vibrate(tier ? 90 : 40);
        if (tier === 'secret' || tier === 'mitico') playLevelUp();
        else playUnlock();
      }, openAt),
      window.setTimeout(() => setPhase('open'), revealAt),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [tier]);

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
              : 'Todos os itens · toque fora de um item para fechar'}
          </p>
        ) : null}
      </motion.div>
    </div>,
    document.body,
  );
}
