import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { AfkRewardIcon, type AfkRewardItem } from '@/lib/afk-rewards';
import { COSMETIC_RARITY_LABELS } from '@/types';
import type { RewardPresentationItem } from '@shared/rewards/presentation';
import './reward-presentation.css';

interface Props {
  item: RewardPresentationItem;
  golden?: boolean;
  onContinue: () => void;
}

function toAfkRewardItem(item: RewardPresentationItem): AfkRewardItem {
  if (item.kind === 'secret_title') {
    return {
      key: item.id,
      kind: 'secret',
      cosmeticId: item.cosmeticId,
      cosmeticIcon: (item.icon ?? 'moon') as AfkRewardItem['cosmeticIcon'],
      secret: true,
      ariaLabel: item.name,
    };
  }
  if (item.kind === 'weapon') {
    return { key: item.id, kind: 'weapon', cosmeticId: item.cosmeticId, ariaLabel: item.name };
  }
  if (item.kind === 'cosmetic') {
    return {
      key: item.id,
      kind: 'cosmetic',
      cosmeticId: item.cosmeticId,
      cosmeticIcon: (item.icon ?? 'star') as AfkRewardItem['cosmeticIcon'],
      ariaLabel: item.name,
    };
  }
  return { key: item.id, kind: item.kind as AfkRewardItem['kind'], amount: item.amount, ariaLabel: item.name };
}

export function SecretRewardReveal({ item, golden = false, onContinue }: Props) {
  const afkItem = toAfkRewardItem(item);
  const rarityLabel = COSMETIC_RARITY_LABELS[item.rarity === 'comum' ? 'comum' : item.rarity] ?? 'Secret';

  return createPortal(
    <button
      type="button"
      className="reward-secret-overlay"
      onClick={onContinue}
      aria-label={`Revelar próxima recompensa — ${item.name}`}
    >
      <div className={`reward-secret-rays${golden ? ' reward-secret-rays--golden' : ''}`} aria-hidden />
      <motion.div
        className={`reward-secret-card${golden ? ' reward-secret-card--golden' : ''}`}
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`reward-secret-frame${golden ? ' reward-secret-frame--golden' : ''}`}>
          <div className="reward-secret-frame__inner">
            {item.kind === 'cosmetic' || item.kind === 'secret_title' ? (
              <CosmeticIcon
                icon={(item.icon ?? 'star') as never}
                avatarId={item.cosmeticId?.startsWith('avatar_') ? item.cosmeticId : undefined}
                size={72}
              />
            ) : (
              <span className="reward-secret-frame__icon">
                <AfkRewardIcon item={afkItem} size={48} />
              </span>
            )}
          </div>
        </div>
        <p className="reward-secret-card__rarity">{rarityLabel}</p>
        <h2 className="reward-secret-card__title">{item.name}</h2>
        {item.description && <p className="reward-secret-card__desc">{item.description}</p>}
        <p className="reward-secret-card__hint">Toque para continuar</p>
      </motion.div>
    </button>,
    document.body,
  );
}
