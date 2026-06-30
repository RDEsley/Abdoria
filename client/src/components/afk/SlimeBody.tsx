import type { AfkEnemyId } from '@/types';
import {
  collectSlimeAccessories,
  resolvePortraitAppearance,
  type SlimeAppearance,
} from '@/types';
import { SlimeAccessoryLayer, SlimeAccessoryPart } from '@/components/afk/SlimeAccessories';

function SlimeHydraHeads() {
  return (
    <div className="game-afk-slime__hydra" aria-hidden>
      {(['l', 'c', 'r'] as const).map((pos) => (
        <div key={pos} className={`game-afk-slime__hydra-neck game-afk-slime__hydra-neck--${pos}`}>
          <div className="game-afk-slime__hydra-head">
            <span className="game-afk-slime__hydra-eye game-afk-slime__hydra-eye--l">
              <span className="game-afk-slime__hydra-pupil" />
            </span>
            <span className="game-afk-slime__hydra-eye game-afk-slime__hydra-eye--r">
              <span className="game-afk-slime__hydra-pupil" />
            </span>
            <span className="game-afk-slime__hydra-mouth" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SlimeBody({
  enemyId,
  isBoss,
  appearance,
  accessories,
  looting,
  portrait = false,
}: {
  enemyId: AfkEnemyId | string;
  isBoss: boolean;
  appearance: SlimeAppearance;
  accessories: ReturnType<typeof collectSlimeAccessories>;
  looting: boolean;
  portrait?: boolean;
}) {
  const isHydra = enemyId === 'boss_hydra';
  const isSkeleton = enemyId === 'skeleton';
  const isLich = enemyId === 'boss_lich';
  const isColossus = enemyId === 'boss_colossus';
  const isGolem = enemyId === 'boss_golem';

  const mouthClass = `game-afk-slime__mouth game-afk-slime__mouth--${appearance.mouth}${
    isBoss && !isHydra ? ' game-afk-slime__mouth--boss' : ''
  }${isSkeleton ? ' game-afk-slime__mouth--skeleton' : ''}`;

  const showCheeks =
    !isSkeleton &&
    !isHydra &&
    (appearance.eyes === 'round' || appearance.eyes === 'anime' || appearance.eyes === 'happy') &&
    (appearance.mouth === 'smile' || appearance.mouth === 'grin' || appearance.mouth === 'o');

  const hasGlasses = accessories.includes('glasses');
  const hasPatch = accessories.includes('patch');

  const faceClass = [
    'game-afk-slime__face',
    `game-afk-slime__face--eyes-${appearance.eyes}`,
    isBoss && !isHydra ? 'game-afk-slime__face--boss' : '',
    isLich ? 'game-afk-slime__face--lich' : '',
    isSkeleton ? 'game-afk-slime__face--skeleton' : '',
    isHydra ? 'game-afk-slime__face--hydra-body' : '',
    isColossus ? 'game-afk-slime__face--colossus' : '',
    isGolem ? 'game-afk-slime__face--golem' : '',
    hasPatch ? 'game-afk-slime__face--patched' : '',
    portrait ? 'game-afk-slime__face--portrait' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="game-afk-slime__blob" />
      {isHydra && <SlimeHydraHeads />}
      {isColossus && <div className="game-afk-slime__colossus-spikes" aria-hidden />}
      {isLich && <div className="game-afk-slime__lich-orbs" aria-hidden />}
      {isGolem && <div className="game-afk-slime__golem-cracks" aria-hidden />}
      <SlimeAccessoryLayer accessories={accessories} looting={looting} layer="back" />
      <div className={faceClass}>
        <span className={`game-afk-slime__eye game-afk-slime__eye--l${hasPatch ? ' game-afk-slime__eye--patched' : ''}`}>
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
        {hasPatch && !looting && <SlimeAccessoryPart kind="patch" />}
      </div>
      <SlimeAccessoryLayer accessories={accessories} looting={looting} layer="front" />
    </>
  );
}

export function buildSlimePortraitData(enemyId: AfkEnemyId) {
  const isBoss = enemyId.startsWith('boss_');
  const elite = ['armored_skeleton', 'crystal_slime', 'storm_slime', 'slime_knight'].includes(enemyId);
  const appearance = resolvePortraitAppearance(enemyId);
  const accessories = collectSlimeAccessories(enemyId, isBoss, elite, appearance);
  return { isBoss, elite, appearance, accessories };
}
