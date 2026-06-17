import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { DailyShopPurchaseCelebration } from '@/components/shop/DailyShopPurchaseCelebration';
import { GameButton } from '@/components/ui/GameButton';
import {
  dailyOfferTitle,
  dailyRewardIcon,
  formatDailyPurchasePrice,
  formatDailyReward,
  isLuckyFreeDailyReward,
} from '@/lib/daily-shop-display';
import type { LojaDiariaSlot } from '@/types';
import { DAILY_LUCK_LABELS, DAILY_RARITY_LABELS } from '@/types';

interface Props {
  slot: LojaDiariaSlot;
  message: string;
  effectId: string;
  onClose: () => void;
}

export function DailyShopRewardReveal({ slot, message, effectId, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const lucky = isLuckyFreeDailyReward(slot);
  const isFree = slot.kind === 'recompensa_diaria';
  const headline = isFree ? 'Recompensa resgatada!' : 'Compra realizada!';

  return createPortal(
    <div
      className="game-daily-reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reward-title"
      onClick={onClose}
    >
      <DailyShopPurchaseCelebration effectId={effectId} fullscreen />

      <motion.div
        className={`game-daily-reward-card game-daily-reward-card--${slot.raridade}`}
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        {lucky && (
          <div className={`game-daily-reward-card__luck game-daily-reward-card__luck--${slot.raridade}`}>
            <Sparkles size={14} aria-hidden />
            <span>{DAILY_LUCK_LABELS[slot.raridade]}</span>
          </div>
        )}

        <p className="game-daily-reward-card__eyebrow">
          <Gift size={13} aria-hidden /> Loja diária
        </p>
        <h2 id="daily-reward-title" className="game-daily-reward-card__title">
          {headline}
        </h2>
        <p className="game-daily-reward-card__message">{message}</p>

        <div className="game-daily-reward-card__loot" aria-label="Recompensa recebida">
          <div className={`game-daily-reward-card__icon game-daily-reward-card__icon--${slot.recompensa_tipo}`}>
            {dailyRewardIcon(slot, 28)}
          </div>
          <p className="game-daily-reward-card__reward">{formatDailyReward(slot)}</p>
          <p className="game-daily-reward-card__rarity">{DAILY_RARITY_LABELS[slot.raridade]}</p>
          <p className="game-daily-reward-card__offer">{dailyOfferTitle(slot)}</p>
          <p className="game-daily-reward-card__label">{slot.label}</p>
        </div>

        {!isFree && (
          <p className="game-daily-reward-card__spent">
            Pago: <strong>{formatDailyPurchasePrice(slot)}</strong>
          </p>
        )}

        <GameButton className="game-daily-reward-card__cta" onClick={onClose}>
          Continuar
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
