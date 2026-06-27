import { Gift } from 'lucide-react';
import { AfkPatrolChest } from '@/components/afk/AfkPatrolChest';
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

function RewardIconGrid({ items, amountPrefixPlus = false }: { items: AfkRewardItem[]; amountPrefixPlus?: boolean }) {
  return (
    <div className="game-afk-rewards__icon-grid" role="list" aria-label="Recompensas da exploração">
      {items.map((item, index) => {
        const showPlusPrefix =
          amountPrefixPlus && (item.kind === 'xp' || item.kind === 'abdoria') && item.amount != null && item.amount > 0;

        return (
        <div
          key={item.key}
          role="listitem"
          className={`game-afk-reward-chip game-afk-reward-chip--${item.kind}${item.secret ? ' game-afk-reward-chip--secret' : ''}`}
          style={{ animationDelay: `${index * 0.07}s` }}
          aria-label={item.ariaLabel}
          title={item.ariaLabel}
        >
          <span className="game-afk-reward-chip__icon">
            <AfkRewardIcon item={item} size={24} />
          </span>
          {item.amount != null && item.amount > 0 && (
            <span className="game-afk-reward-chip__badge tabular-nums">
              {showPlusPrefix ? <span className="game-afk-reward-chip__badge-sign" aria-hidden>+</span> : null}
              <span>{item.amount}</span>
            </span>
          )}
        </div>
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
    <RewardIconGrid items={items} amountPrefixPlus={showLootFromChest} />
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
