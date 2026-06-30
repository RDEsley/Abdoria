import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { AfkPatrolChest } from '@/components/afk/AfkPatrolChest';
import { AfkLootTooltip } from '@/components/afk/AfkLootTooltip';
import { AfkRewardIcon, buildAfkRewardItems, countAfkDropEvents, type AfkRewardItem } from '@/lib/afk-rewards';
import type { AfkPendingReward } from '@/types';

export { countAfkRewardItems, countAfkDropEvents } from '@/lib/afk-rewards';

interface Props {
  pending: AfkPendingReward | null | undefined;
  withChest?: boolean;
  chestOpen?: boolean;
  chestOpening?: boolean;
  chestCelebrate?: boolean;
  chestShaking?: boolean;
}

/** Camada de partículas/luzes por raridade ao redor do ícone do loot. */
function RewardChipFx({ rarity }: { rarity: AfkRewardItem['rarity'] }) {
  if (rarity === 'lendario') {
    return (
      <span className="game-afk-reward-chip__orbit" aria-hidden>
        <i /><i /><i /><i />
      </span>
    );
  }
  if (rarity === 'secret' || rarity === 'golden_secret') {
    return (
      <span className="game-afk-reward-chip__lightshow" aria-hidden>
        <i /><i /><i /><i /><i /><i />
      </span>
    );
  }
  return null;
}

function RewardIconGrid({
  items,
  amountPrefixPlus = false,
  interactive = false,
}: {
  items: AfkRewardItem[];
  amountPrefixPlus?: boolean;
  interactive?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <div className="game-afk-rewards__icon-grid" role="list" aria-label="Recompensas da exploração">
      {items.map((item, index) => {
        const showPlusPrefix =
          amountPrefixPlus && (item.kind === 'xp' || item.kind === 'abdoria') && item.amount != null && item.amount > 0;
        const rarity = item.rarity ?? 'comum';
        const isRare = rarity === 'lendario' || rarity === 'secret' || rarity === 'golden_secret';
        const selected = selectedKey === item.key;

        const chipClass = [
          'game-afk-reward-chip',
          `game-afk-reward-chip--${item.kind}`,
          item.secret || rarity === 'secret' ? 'game-afk-reward-chip--secret' : '',
          rarity === 'golden_secret' ? 'game-afk-reward-chip--golden-secret' : '',
          rarity === 'lendario' ? 'game-afk-reward-chip--legendary' : '',
          selected ? 'game-afk-reward-chip--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const content = (
          <>
            {isRare && <RewardChipFx rarity={rarity} />}
            <span className="game-afk-reward-chip__icon">
              <AfkRewardIcon item={item} size={24} />
            </span>
            {item.amount != null && item.amount > 0 && (
              <span className="game-afk-reward-chip__badge tabular-nums">
                {showPlusPrefix ? <span className="game-afk-reward-chip__badge-sign" aria-hidden>+</span> : null}
                <span>{item.amount}</span>
              </span>
            )}
            <AnimatePresence>
              {selected && (
                <AfkLootTooltip item={item} onClose={() => setSelectedKey(null)} />
              )}
            </AnimatePresence>
          </>
        );

        if (!interactive) {
          return (
            <div
              key={item.key}
              role="listitem"
              className={chipClass}
              style={{ animationDelay: `${index * 0.07}s` }}
              aria-label={item.ariaLabel}
              title={item.ariaLabel}
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            role="listitem"
            className={chipClass}
            style={{ animationDelay: `${index * 0.07}s` }}
            aria-label={`${item.ariaLabel} — toque para detalhes`}
            aria-expanded={selected}
            onClick={() => setSelectedKey((prev) => (prev === item.key ? null : item.key))}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export function AfkRewardGrid({
  pending,
  withChest = false,
  chestOpen = false,
  chestOpening = false,
  chestCelebrate = false,
  chestShaking = false,
}: Props) {
  const items = buildAfkRewardItems(pending);
  const hasLoot = items.length > 0;
  const dropCount = countAfkDropEvents(pending);
  const showLootFromChest = withChest && (chestOpen || chestOpening);

  const iconGrid = hasLoot ? (
    <RewardIconGrid items={items} amountPrefixPlus={showLootFromChest} interactive={showLootFromChest} />
  ) : null;

  const emptyState = (
    <div className="game-afk-rewards__empty-state">
      <Gift size={20} aria-hidden />
    </div>
  );

  if (withChest) {
    const showLoot = chestOpen || chestOpening;

    return (
      <div
        className={`game-afk-rewards-panel game-afk-rewards-panel--chest${chestCelebrate ? ' game-afk-rewards-panel--celebrate' : ''}`}
      >
        {showLoot && iconGrid ? (
          <div
            className={`game-afk-chest-loot-row${chestCelebrate ? ' game-afk-chest-loot-row--celebrate' : ' game-afk-chest-loot-row--visible'}`}
            aria-live="polite"
          >
            {iconGrid}
          </div>
        ) : null}
        <AfkPatrolChest
          open={chestOpen}
          opening={chestOpening}
          shaking={chestShaking}
          ready={hasLoot && !chestOpen && !chestOpening && !chestCelebrate}
          empty={!hasLoot}
          celebrate={chestCelebrate}
          itemCount={hasLoot && !showLoot ? dropCount : 0}
          size={chestOpen || chestOpening || chestShaking ? 'lg' : 'sm'}
        />
      </div>
    );
  }

  return (
    <div className="game-afk-rewards-panel game-afk-rewards-panel--flat">
      {iconGrid ?? emptyState}
    </div>
  );
}
