import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { AFK_CHEST_RECEIVED_EVENT } from '@/lib/afk-loot-orbs';
import { AfkPatrolChest } from '@/components/afk/AfkPatrolChest';
import { AfkLootTooltip } from '@/components/afk/AfkLootTooltip';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import {
  AfkRewardIcon,
  buildAfkRewardItems,
  countAfkDropEvents,
  type AfkRewardItem,
} from '@/lib/afk-rewards';
import type { AfkPendingReward } from '@/types';

export { countAfkRewardItems, countAfkDropEvents } from '@/lib/afk-rewards';

const CHEST_GLOW_LOTTIE_URL = '/assets/reward-chest.json';

interface Props {
  pending: AfkPendingReward | null | undefined;
  withChest?: boolean;
  chestOpen?: boolean;
  chestOpening?: boolean;
  chestCelebrate?: boolean;
  chestShaking?: boolean;
  chestCharged?: boolean;
  revealIndex?: number;
}

/** Camada de partículas/luzes por raridade ao redor do ícone do loot. */
function RewardChipFx({ rarity }: { rarity: AfkRewardItem['rarity'] }) {
  if (rarity === 'lendario' || rarity === 'mitico') {
    return (
      <span className="game-afk-reward-chip__orbit" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (rarity === 'secret' || rarity === 'golden_secret') {
    return (
      <span className="game-afk-reward-chip__lightshow" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
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
          amountPrefixPlus &&
          (item.kind === 'xp' || item.kind === 'abdoria') &&
          item.amount != null &&
          item.amount > 0;
        const rarity = item.rarity ?? 'comum';
        const isRare =
          rarity === 'lendario' ||
          rarity === 'mitico' ||
          rarity === 'secret' ||
          rarity === 'golden_secret';
        const selected = selectedKey === item.key;

        const chipClass = [
          'game-afk-reward-chip',
          `game-afk-reward-chip--${item.kind}`,
          item.cosmeticId?.startsWith('magia_') ? 'game-afk-reward-chip--spell' : '',
          item.secret || rarity === 'secret' ? 'game-afk-reward-chip--secret' : '',
          rarity === 'golden_secret' ? 'game-afk-reward-chip--golden-secret' : '',
          rarity === 'lendario' ? 'game-afk-reward-chip--legendary' : '',
          rarity === 'raro' ? 'game-afk-reward-chip--raro' : '',
          rarity === 'epico' ? 'game-afk-reward-chip--epico' : '',
          rarity === 'mitico' ? 'game-afk-reward-chip--mitico' : '',
          selected ? 'game-afk-reward-chip--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const content = (
          <>
            {isRare && <RewardChipFx rarity={rarity} />}
            {item.cosmeticId?.startsWith('magia_') && (
              <span className="game-afk-reward-chip__new" aria-hidden>
                Nova!
              </span>
            )}
            <span className="game-afk-reward-chip__icon">
              <AfkRewardIcon item={item} size={24} />
            </span>
            {item.amount != null && item.amount > 0 && (
              <span className="game-afk-reward-chip__badge tabular-nums">
                {showPlusPrefix ? (
                  <span className="game-afk-reward-chip__badge-sign" aria-hidden>
                    +
                  </span>
                ) : null}
                <span>{item.amount}</span>
              </span>
            )}
            <AnimatePresence>
              {selected && <AfkLootTooltip item={item} onClose={() => setSelectedKey(null)} />}
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
            onClick={(event) => {
              event.stopPropagation();
              setSelectedKey((prev) => (prev === item.key ? null : item.key));
            }}
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
  chestCharged = false,
  revealIndex,
}: Props) {
  const items = buildAfkRewardItems(pending);
  const visibleItems =
    revealIndex != null && revealIndex < items.length ? [items[revealIndex]!] : items;
  const spotlightItem =
    revealIndex != null && revealIndex < items.length ? items[revealIndex] : null;
  const hasLoot = items.length > 0;
  const dropCount = countAfkDropEvents(pending);
  // O contador do baú "vaza" a raridade do melhor item lá dentro: arco-íris
  // quando tem Mítico, preto-e-branco piscando quando tem Secret. É a isca
  // pra abrir — o jogador vê que tem algo grande antes mesmo de coletar.
  const hasSecret = items.some(
    (item) => item.rarity === 'secret' || item.rarity === 'golden_secret',
  );
  const hasMitico = items.some((item) => item.rarity === 'mitico');
  const badgeTier = hasSecret ? 'secret' : hasMitico ? 'mitico' : null;
  const showLootFromChest = withChest && (chestOpen || chestOpening);
  const chestGlowData = useLottieAsset(CHEST_GLOW_LOTTIE_URL);
  const [bump, setBump] = useState(false);
  const bumpTimerRef = useRef<number | undefined>(undefined);

  // Cada bolinha de loot que chega dá uma mexida no baú. O timer é reiniciado
  // a cada chegada (em vez de acumular): com várias bolinhas em sequência a
  // mexida vira uma só, contínua, em vez de engasgar remontando a animação.
  useEffect(() => {
    if (!withChest) return undefined;

    const onReceived = () => {
      setBump(false);
      window.clearTimeout(bumpTimerRef.current);
      requestAnimationFrame(() => setBump(true));
      bumpTimerRef.current = window.setTimeout(() => setBump(false), 340);
    };

    window.addEventListener(AFK_CHEST_RECEIVED_EVENT, onReceived);
    return () => {
      window.removeEventListener(AFK_CHEST_RECEIVED_EVENT, onReceived);
      window.clearTimeout(bumpTimerRef.current);
    };
  }, [withChest]);

  const iconGrid = hasLoot ? (
    <RewardIconGrid
      items={visibleItems}
      amountPrefixPlus={showLootFromChest}
      interactive={showLootFromChest}
    />
  ) : null;

  const emptyState = (
    <div className="game-afk-rewards__empty-state">
      <Gift size={20} aria-hidden />
    </div>
  );

  if (withChest) {
    const showLoot = chestOpen || (!chestCelebrate && chestOpening);

    return (
      <div
        className={`game-afk-rewards-panel game-afk-rewards-panel--chest${chestCelebrate ? ' game-afk-rewards-panel--celebrate' : ''}`}
      >
        {showLoot && iconGrid ? (
          <div
            className={`game-afk-chest-loot-row${chestCelebrate ? ' game-afk-chest-loot-row--celebrate' : ' game-afk-chest-loot-row--visible'}${spotlightItem?.kind === 'weapon' || spotlightItem?.kind === 'cosmetic' ? ' game-afk-chest-loot-row--equipment' : ''}${revealIndex === items.length ? ' game-afk-chest-loot-row--summary' : ''}`}
            aria-live="polite"
          >
            {iconGrid}
          </div>
        ) : null}
        {showLoot && chestGlowData ? (
          <div className="game-afk-chest-glow" aria-hidden>
            <LottieView data={chestGlowData} loop />
          </div>
        ) : null}
        <AfkPatrolChest
          open={chestOpen}
          opening={chestOpening}
          shaking={chestShaking}
          charged={chestCharged}
          ready={hasLoot && !chestOpen && !chestOpening && !chestCelebrate}
          empty={!hasLoot}
          celebrate={chestCelebrate}
          itemCount={hasLoot && !showLoot ? dropCount : 0}
          size={chestOpen || chestOpening || chestShaking || chestCharged ? 'lg' : 'sm'}
          orbTarget={!chestCelebrate}
          bump={bump}
          badgeTier={badgeTier}
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
