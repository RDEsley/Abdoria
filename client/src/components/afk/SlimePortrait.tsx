import { useMemo } from 'react';
import type { AfkEnemyId } from '@/types';
import { AFK_ENEMIES } from '@/types';
import { Lock } from 'lucide-react';
import { buildSlimePortraitData, SlimeBody } from '@/components/afk/SlimeBody';

interface Props {
  enemyId: AfkEnemyId;
  locked?: boolean;
}

export function SlimePortrait({ enemyId, locked = false }: Props) {
  const def = AFK_ENEMIES[enemyId];
  const { isBoss, elite, appearance, accessories } = useMemo(
    () => buildSlimePortraitData(enemyId),
    [enemyId],
  );

  if (locked) {
    return (
      <div className="game-afk-portrait game-afk-portrait--locked" aria-hidden>
        <span className="game-afk-portrait__silhouette" />
        <Lock size={18} className="game-afk-portrait__lock" />
      </div>
    );
  }

  const className = [
    'game-afk-portrait',
    `game-afk-portrait--${enemyId}`,
    `game-afk-enemy--${enemyId}`,
    isBoss ? 'game-afk-enemy--boss' : '',
    elite ? 'game-afk-enemy--elite' : '',
    enemyId === 'golden_slime' ? 'game-afk-enemy--golden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-label={def?.label ?? 'Inimigo'}>
      {isBoss && <div className="game-afk-enemy__boss-aura" aria-hidden />}
      {enemyId === 'golden_slime' && <div className="game-afk-enemy__golden-sparkle" aria-hidden />}
      <div className="game-afk-enemy__sprite game-afk-portrait__sprite">
        <SlimeBody
          enemyId={enemyId}
          isBoss={isBoss}
          appearance={appearance}
          accessories={accessories}
          looting={false}
          portrait
        />
      </div>
    </div>
  );
}
