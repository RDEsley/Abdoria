import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AfkRewardIcon, AFK_RARITY_LABEL, type AfkRewardItem } from '@/lib/afk-rewards';

interface Props {
  item: AfkRewardItem;
  onClose: () => void;
}

/** Tooltip interativo com as informações do item coletado (clique no loot do baú). */
export function AfkLootTooltip({ item, onClose }: Props) {
  const rarity = item.rarity ?? 'comum';

  return (
    <motion.div
      className={`game-afk-loot-tooltip game-afk-loot-tooltip--${rarity}`}
      role="dialog"
      aria-label={`Detalhes: ${item.ariaLabel}`}
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        type="button"
        className="game-afk-loot-tooltip__close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Fechar detalhes"
      >
        <X size={13} aria-hidden />
      </button>

      <div className="game-afk-loot-tooltip__head">
        <span className="game-afk-loot-tooltip__icon">
          <AfkRewardIcon item={item} size={26} />
        </span>
        <div className="game-afk-loot-tooltip__title">
          <p className="game-afk-loot-tooltip__name">{item.ariaLabel}</p>
          <span className={`game-afk-loot-tooltip__rarity game-afk-loot-tooltip__rarity--${rarity}`}>
            {AFK_RARITY_LABEL[rarity]}
          </span>
        </div>
      </div>

      {item.description ? <p className="game-afk-loot-tooltip__desc">{item.description}</p> : null}

      {item.amount != null && item.amount > 0 ? (
        <p className="game-afk-loot-tooltip__amount">
          Quantidade: <strong className="tabular-nums">{item.amount}</strong>
        </p>
      ) : null}
    </motion.div>
  );
}
