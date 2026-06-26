import { Swords } from 'lucide-react';
import { AfkPatrolChest } from '@/components/afk/AfkPatrolChest';
import { AfkRewardIcon, buildAfkRewardItems, type AfkRewardItem } from '@/lib/afk-rewards';
import type { AfkPendingReward } from '@/types';

export { countAfkRewardItems } from '@/lib/afk-rewards';

interface Props {
  pending: AfkPendingReward | null | undefined;
  withChest?: boolean;
  chestOpen?: boolean;
  chestOpening?: boolean;
  chestCelebrate?: boolean;
  chestShaking?: boolean;
}

function RewardIconGrid({ items, stock = false }: { items: AfkRewardItem[]; stock?: boolean }) {
  return (
    <div
      className={`game-afk-rewards__icon-grid${stock ? ' game-afk-rewards__icon-grid--stock' : ''}`}
      role="list"
      aria-label="Recompensas da patrulha"
    >
      {items.map((item, index) => (
        <div
          key={item.key}
          role="listitem"
          className={`game-afk-reward-chip game-afk-reward-chip--${item.kind}${item.secret ? ' game-afk-reward-chip--secret' : ''}${stock ? ' game-afk-reward-chip--stock' : ''}`}
          style={stock ? undefined : { animationDelay: `${index * 0.07}s` }}
          aria-label={item.ariaLabel}
          title={item.ariaLabel}
        >
          <span className="game-afk-reward-chip__icon">
            <AfkRewardIcon item={item} size={stock ? 16 : 24} />
          </span>
          {item.amount != null && item.amount > 0 && (
            <span className="game-afk-reward-chip__badge tabular-nums">{item.amount}</span>
          )}
        </div>
      ))}
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

  const iconGrid = hasLoot ? <RewardIconGrid items={items} /> : null;
  const stockGrid = hasLoot ? <RewardIconGrid items={items} stock /> : null;

  const emptyState = (
    <div className="game-afk-rewards__empty-state">
      <Swords size={20} aria-hidden />
    </div>
  );

  if (withChest) {
    const showStock = hasLoot && !chestOpen && !chestOpening && !chestCelebrate;

    return (
      <div className="game-afk-rewards-panel">
        <AfkPatrolChest
          open={chestOpen}
          opening={chestOpening}
          shaking={chestShaking}
          ready={hasLoot && !chestOpen && !chestOpening && !chestCelebrate}
          empty={!hasLoot}
          celebrate={chestCelebrate}
          size={chestOpen || chestOpening || chestShaking ? 'lg' : 'sm'}
          stock={showStock ? stockGrid : null}
        >
          {chestOpen || chestOpening ? iconGrid ?? emptyState : null}
        </AfkPatrolChest>
      </div>
    );
  }

  return (
    <div className="game-afk-rewards-panel game-afk-rewards-panel--flat">
      {iconGrid ?? emptyState}
    </div>
  );
}
