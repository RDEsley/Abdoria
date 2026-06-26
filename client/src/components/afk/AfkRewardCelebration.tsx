import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AfkRewardGrid } from '@/components/afk/AfkRewardGrid';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/context/AuthContext';
import { resolveCosmeticos, type AfkPendingReward } from '@/types';

interface Props {
  claimed: AfkPendingReward;
  onClose: () => void;
}

type ChestPhase = 'closed' | 'shaking' | 'opening' | 'open';

export function AfkRewardCelebration({ claimed, onClose }: Props) {
  const { user } = useAuth();
  const effectId = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp).efeito_equipado;
  const [phase, setPhase] = useState<ChestPhase>('closed');

  useEffect(() => {
    const shakeTimer = window.setTimeout(() => setPhase('shaking'), 220);
    const openTimer = window.setTimeout(() => setPhase('opening'), 520);
    const revealTimer = window.setTimeout(() => setPhase('open'), 1280);
    return () => {
      window.clearTimeout(shakeTimer);
      window.clearTimeout(openTimer);
      window.clearTimeout(revealTimer);
    };
  }, []);

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
      onClick={onClose}
    >
      <CosmeticEffectLayer effectId={effectId} mode="burst" />

      <motion.div
        className="game-daily-reward-card game-daily-reward-card--raro game-afk-celebration-card"
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="afk-reward-title" className="sr-only">
          Recompensas da patrulha coletadas
        </h2>

        <AfkRewardGrid
          pending={claimed}
          withChest
          chestCelebrate
          chestShaking={phase === 'shaking'}
          chestOpen={phase === 'open'}
          chestOpening={phase === 'opening'}
        />

        <GameButton className="w-full mt-5" size="lg" onClick={onClose} disabled={phase !== 'open'}>
          {phase === 'open' ? 'Continuar' : 'Abrindo baú...'}
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
