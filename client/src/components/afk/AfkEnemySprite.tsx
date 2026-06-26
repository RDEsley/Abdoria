import type { AfkCombatSnapshot, AfkEnemyId } from '@/types';
import { AFK_ENEMIES } from '@/types';

interface Props {
  combat: AfkCombatSnapshot;
  hit: boolean;
  dying: boolean;
  hitKey: number;
}

export function AfkEnemySprite({ combat, hit, dying, hitKey }: Props) {
  const enemyId = combat.enemy_id;
  const label = AFK_ENEMIES[enemyId]?.label ?? 'Inimigo';

  const className = [
    'game-afk-enemy',
    `game-afk-enemy--${enemyId}`,
    combat.is_boss ? 'game-afk-enemy--boss' : '',
    combat.elite ? 'game-afk-enemy--elite' : '',
    hit ? 'game-afk-enemy--hit' : '',
    dying ? 'game-afk-enemy--dying' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={hit ? `hit-${hitKey}` : 'idle'} className={className} aria-label={label}>
      {combat.is_boss && <div className="game-afk-enemy__boss-aura" aria-hidden />}
      <div className="game-afk-enemy__sprite">
        <SlimeBody id={enemyId} isBoss={combat.is_boss} elite={combat.elite} />
      </div>
    </div>
  );
}

function SlimeBody({
  id,
  isBoss,
  elite,
}: {
  id: AfkEnemyId;
  isBoss: boolean;
  elite: boolean;
}) {
  return (
    <>
      <div className="game-afk-slime__blob" />
      <div className="game-afk-slime__shine" />
      <div className="game-afk-slime__shine game-afk-slime__shine--sm" />
      <div
        className={`game-afk-slime__face ${isBoss ? 'game-afk-slime__face--boss' : ''} ${
          id === 'boss_lich' ? 'game-afk-slime__face--lich' : ''
        }`}
      >
        <span className="game-afk-slime__eye game-afk-slime__eye--l">
          <span className="game-afk-slime__pupil" />
        </span>
        <span className="game-afk-slime__eye game-afk-slime__eye--r">
          <span className="game-afk-slime__pupil" />
        </span>
        <span className={`game-afk-slime__mouth ${isBoss ? 'game-afk-slime__mouth--boss' : ''}`} />
      </div>
      <SlimeAccessory id={id} isBoss={isBoss} elite={elite} />
    </>
  );
}

function SlimeAccessory({
  id,
  isBoss,
  elite,
}: {
  id: AfkEnemyId;
  isBoss: boolean;
  elite: boolean;
}) {
  if (isBoss) {
    switch (id) {
      case 'boss_colossus':
        return <span className="game-afk-slime__crown" aria-hidden />;
      case 'boss_lich':
        return (
          <>
            <span className="game-afk-slime__hood" aria-hidden />
            <span className="game-afk-slime__staff" aria-hidden />
          </>
        );
      case 'boss_hydra':
        return (
          <>
            <span className="game-afk-slime__mini-head game-afk-slime__mini-head--l" aria-hidden />
            <span className="game-afk-slime__mini-head game-afk-slime__mini-head--c" aria-hidden />
            <span className="game-afk-slime__mini-head game-afk-slime__mini-head--r" aria-hidden />
          </>
        );
      default:
        return <span className="game-afk-slime__crown" aria-hidden />;
    }
  }

  switch (id) {
    case 'bat':
    case 'demon_bat':
      return (
        <>
          <span className="game-afk-slime__wing game-afk-slime__wing--l" aria-hidden />
          <span className="game-afk-slime__wing game-afk-slime__wing--r" aria-hidden />
          {id === 'demon_bat' && <span className="game-afk-slime__horn" aria-hidden />}
        </>
      );
    case 'zombie':
      return <span className="game-afk-slime__scar" aria-hidden />;
    case 'skeleton':
    case 'armored_skeleton':
      return (
        <>
          <span className="game-afk-slime__bone game-afk-slime__bone--a" aria-hidden />
          <span className="game-afk-slime__bone game-afk-slime__bone--b" aria-hidden />
          {id === 'armored_skeleton' && <span className="game-afk-slime__helm" aria-hidden />}
        </>
      );
    case 'slime_knight':
      return <span className="game-afk-slime__helm" aria-hidden />;
    default:
      if (elite) return <span className="game-afk-slime__spike" aria-hidden />;
      return null;
  }
}
