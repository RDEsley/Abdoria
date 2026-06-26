import { useEffect } from 'react';
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

export function AfkRewardCelebration({ claimed, onClose }: Props) {
  const { user } = useAuth();
  const effectId = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp).efeito_equipado;

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
        <p className="game-daily-reward-card__eyebrow">Patrulha de Abdoria</p>
        <h2 id="afk-reward-title" className="game-daily-reward-card__title">
          Baú da Patrulha!
        </h2>
        <p className="game-daily-reward-card__message">Seu herói voltou com o espólio da defesa do reino.</p>

        <div className="mt-4">
          <AfkRewardGrid pending={claimed} />
        </div>

        <GameButton className="w-full mt-5" size="lg" onClick={onClose}>
          Continuar aventura
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
