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
}

export function AfkMascotHero({ weapon, attacking, attackSeq }: Props) {
  const heroClass = [
    'game-afk-mascot',
    `game-afk-mascot--${weapon}`,
    attacking ? 'game-afk-mascot--attack' : 'game-afk-mascot--idle',
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
          <>
            <span key={`bow-flash-${attackSeq}`} className="game-afk-mascot__bow-release" aria-hidden />
            <span key={`bow-streak-${attackSeq}`} className="game-afk-mascot__arrow-streak" aria-hidden />
            <span key={`arrow-${attackSeq}`} className="game-afk-mascot__arrow-projectile" aria-hidden />
            <span key={`arrow-tail-${attackSeq}`} className="game-afk-mascot__arrow-tail" aria-hidden />
            <span key={`arrow-sp1-${attackSeq}`} className="game-afk-mascot__arrow-spark game-afk-mascot__arrow-spark--1" aria-hidden />
            <span key={`arrow-sp2-${attackSeq}`} className="game-afk-mascot__arrow-spark game-afk-mascot__arrow-spark--2" aria-hidden />
          </>
        )}
        {weapon === 'espada' && attacking && (
          <span key={`sword-release-${attackSeq}`} className="game-afk-mascot__sword-release" aria-hidden />
        )}
      </div>
    </div>
  );
}
