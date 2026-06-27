import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { AfkRewardIcon, type AfkRewardItem } from '@/lib/afk-rewards';
import { COSMETIC_RARITY_LABELS, CURRENCY_NAME } from '@/types';
import type { RewardPresentationItem } from '@shared/rewards/presentation';
import './reward-presentation.css';

interface Props {
  items: RewardPresentationItem[];
  onClose: () => void;
}

function rewardChipLabel(item: RewardPresentationItem): string {
  if (item.amount != null && item.amount > 1) return `${item.name} ×${item.amount}`;
  if (item.kind === 'xp' && item.amount) return `+${item.amount} XP`;
  if (item.kind === 'abdoria' && item.amount) return `+${item.amount} ${CURRENCY_NAME}`;
  return item.name;
}

function toAfkRewardItem(item: RewardPresentationItem): AfkRewardItem {
  return {
    key: item.id,
    kind: item.kind === 'secret_title' ? 'secret' : (item.kind as AfkRewardItem['kind']),
    amount: item.amount,
    cosmeticId: item.cosmeticId,
    cosmeticIcon: (item.icon ?? 'star') as AfkRewardItem['cosmeticIcon'],
    ariaLabel: item.name,
  };
}

export function RewardSummaryReveal({ items, onClose }: Props) {
  return createPortal(
    <div className="reward-summary-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <motion.div
        className="reward-summary-card"
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="reward-summary-card__title">Recompensas coletadas</h2>
        <div className="reward-summary-grid">
          {items.map((item) => {
            const afkItem = toAfkRewardItem(item);
            const isLegendary = item.rarity === 'lendario';
            return (
              <article
                key={item.id}
                className={`reward-summary-chip reward-summary-chip--${item.rarity}${isLegendary ? ' reward-summary-chip--rainbow' : ''}`}
              >
                <div className={`reward-summary-chip__icon${isLegendary ? ' reward-summary-chip__icon--rainbow' : ''}`}>
                  {item.kind === 'cosmetic' && item.icon ? (
                    <CosmeticIcon icon={item.icon as never} size={28} />
                  ) : (
                    <AfkRewardIcon item={afkItem} size={28} />
                  )}
                </div>
                <div className="reward-summary-chip__body">
                  <p className="reward-summary-chip__name">{rewardChipLabel(item)}</p>
                  <p className="reward-summary-chip__rarity">
                    {COSMETIC_RARITY_LABELS[item.rarity === 'comum' ? 'comum' : item.rarity] ?? item.rarity}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        <GameButton className="w-full mt-4" size="lg" onClick={onClose}>
          Continuar
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
