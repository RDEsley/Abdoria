import { useMemo } from 'react';
import type { AfkCombatSnapshot } from '@/types';
import {
  AFK_ENEMIES,
  accessoryDropMotion,
  collectSlimeAccessories,
  hashCombatSeed,
  resolveSlimeAppearance,
} from '@/types';
import { SlimeAccessoryLayer, SlimeAccessoryLoot, SlimeAccessoryPart } from '@/components/afk/SlimeAccessories';

interface Props {
  combat: AfkCombatSnapshot;
  userId: string;
  spawnKillsTotal: number;
  hit: boolean;
  dying: boolean;
  looting: boolean;
  hitKey: number;
}

export function AfkEnemySprite({
  combat,
  userId,
  spawnKillsTotal,
  hit,
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
    enemyId === 'golden_slime' ? 'game-afk-enemy--golden' : '',
    hit ? 'game-afk-enemy--hit' : '',
    dying ? 'game-afk-enemy--dying' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={hit ? `hit-${hitKey}` : 'idle'} className={className} aria-label={label}>
      {combat.is_boss && <div className="game-afk-enemy__boss-aura" aria-hidden />}
      {enemyId === 'golden_slime' && <div className="game-afk-enemy__golden-sparkle" aria-hidden />}

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
                rotation={motion.rot}
                delayMs={index * 45}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlimeBody({
  enemyId,
  isBoss,
  appearance,
  accessories,
  looting,
}: {
  enemyId: string;
  isBoss: boolean;
  appearance: ReturnType<typeof resolveSlimeAppearance>;
  accessories: ReturnType<typeof collectSlimeAccessories>;
  looting: boolean;
}) {
  const mouthClass = `game-afk-slime__mouth game-afk-slime__mouth--${appearance.mouth}${
    isBoss ? ' game-afk-slime__mouth--boss' : ''
  }`;
  const showCheeks = appearance.eyes === 'round' && (appearance.mouth === 'smile' || appearance.mouth === 'grin');
  const hasGlasses = accessories.includes('glasses');

  return (
    <>
      <div className="game-afk-slime__blob" />
      <SlimeAccessoryLayer accessories={accessories} looting={looting} layer="back" />
      <div
        className={`game-afk-slime__face game-afk-slime__face--eyes-${appearance.eyes} ${
          isBoss ? 'game-afk-slime__face--boss' : ''
        } ${enemyId === 'boss_lich' ? 'game-afk-slime__face--lich' : ''}`}
      >
        <span className="game-afk-slime__eye game-afk-slime__eye--l">
          <span className="game-afk-slime__iris" />
        </span>
        <span className="game-afk-slime__eye game-afk-slime__eye--r">
          <span className="game-afk-slime__iris" />
        </span>
        <span className={mouthClass} />
        {showCheeks && (
          <>
            <span className="game-afk-slime__cheek game-afk-slime__cheek--l" aria-hidden />
            <span className="game-afk-slime__cheek game-afk-slime__cheek--r" aria-hidden />
          </>
        )}
        {hasGlasses && !looting && <SlimeAccessoryPart kind="glasses" />}
      </div>
      <SlimeAccessoryLayer accessories={accessories} looting={looting} layer="front" />
    </>
  );
}
