import { useMemo } from 'react';
import type { AfkCombatSnapshot } from '@/types';
import {
  AFK_ENEMIES,
  accessoryDropMotion,
  collectSlimeAccessories,
  hashCombatSeed,
  resolveSlimeAppearance,
} from '@/types';
import { SlimeAccessoryLoot } from '@/components/afk/SlimeAccessories';
import { SlimeBody } from '@/components/afk/SlimeBody';

interface Props {
  combat: AfkCombatSnapshot;
  userId: string;
  spawnKillsTotal: number;
  hit: boolean;
  critHit?: boolean;
  dying: boolean;
  looting: boolean;
  hitKey: number;
}

export function AfkEnemySprite({
  combat,
  userId,
  spawnKillsTotal,
  hit,
  critHit = false,
  dying,
  looting,
  hitKey,
}: Props) {
  const enemyId = combat.enemy_id;
  const label = AFK_ENEMIES[enemyId]?.label ?? 'Inimigo';

  const faceSeed = useMemo(
    () => hashCombatSeed(`${userId}:${spawnKillsTotal}:face`),
    [userId, spawnKillsTotal],
  );

  const appearance = useMemo(
    () => resolveSlimeAppearance(faceSeed, enemyId, combat.is_boss, combat.elite),
    [faceSeed, enemyId, combat.is_boss, combat.elite],
  );

  const accessories = useMemo(
    () => collectSlimeAccessories(enemyId, combat.is_boss, combat.elite, appearance),
    [enemyId, combat.is_boss, combat.elite, appearance],
  );

  const className = [
    'game-afk-enemy',
    `game-afk-enemy--${enemyId}`,
    combat.is_boss ? 'game-afk-enemy--boss' : '',
    combat.elite ? 'game-afk-enemy--elite' : '',
    enemyId === 'golden_slime' || enemyId === 'magic_rabbit' ? 'game-afk-enemy--golden' : '',
    hit && !critHit ? 'game-afk-enemy--hit' : '',
    hit && critHit ? 'game-afk-enemy--crit-hit' : '',
    dying ? 'game-afk-enemy--dying' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={hit ? `hit-${hitKey}` : 'idle'} className={className} aria-label={label}>
      {combat.is_boss && <div className="game-afk-enemy__boss-aura" aria-hidden />}
      {(enemyId === 'golden_slime' || enemyId === 'magic_rabbit') && <div className="game-afk-enemy__golden-sparkle" aria-hidden />}

      <div className="game-afk-enemy__sprite">
        <SlimeBody
          enemyId={enemyId}
          isBoss={combat.is_boss}
          appearance={appearance}
          accessories={accessories}
          looting={looting}
        />
      </div>

      {looting && (
        <div className="game-afk-enemy__loot-layer" aria-hidden>
          {accessories.map((kind, index) => {
            const motion = accessoryDropMotion(faceSeed, index);
            return (
              <SlimeAccessoryLoot
                key={`${kind}-${index}`}
                kind={kind}
                driftX={motion.x}
                driftY={motion.y}
                rotation={motion.rot}
                delayMs={index * 55}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
