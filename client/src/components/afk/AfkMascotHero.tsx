import type { ArmaPreferida } from '@/types';

export type MascotSpriteWeapon = ArmaPreferida | 'magia';

const MASCOT_SPRITE_SRC: Record<MascotSpriteWeapon, string> = {
  arco: '/assets/patrol-mascot-arco.png',
  espada: '/assets/patrol-mascot-espada.png',
  magia: '/assets/patrol-mascot-magia.png',
};

interface Props {
  weapon: MascotSpriteWeapon;
  attacking: boolean;
  attackSeq: number;
  isCrit?: boolean;
}

export function AfkMascotHero({ weapon, attacking, attackSeq, isCrit = false }: Props) {
  const heroClass = [
    'game-afk-mascot',
    `game-afk-mascot--${weapon}`,
    attacking ? 'game-afk-mascot--attack' : 'game-afk-mascot--idle',
    attacking && isCrit ? 'game-afk-mascot--crit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={attackSeq} className={heroClass} aria-hidden>
      <div className="game-afk-mascot__shadow" />
      <div className="game-afk-mascot__figure">
        <img
          src={MASCOT_SPRITE_SRC[weapon]}
          alt=""
          className="game-afk-mascot__sprite-img"
          draggable={false}
        />
        {weapon === 'magia' && attacking && (
          <span key={`magic-${attackSeq}`} className="game-afk-mascot__magic-burst" aria-hidden />
        )}
        {weapon === 'arco' && attacking && (
          <span
            key={`bow-flash-${attackSeq}`}
            className={`game-afk-mascot__bow-release${isCrit ? ' game-afk-mascot__bow-release--crit' : ''}`}
            aria-hidden
          />
        )}
        {weapon === 'espada' && attacking && (
          <span
            key={`sword-release-${attackSeq}`}
            className={`game-afk-mascot__sword-release${isCrit ? ' game-afk-mascot__sword-release--crit' : ''}`}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
