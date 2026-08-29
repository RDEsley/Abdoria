import type { ArmaPreferida, PersonagemGenero } from '@/types';

export type MascotSpriteWeapon = ArmaPreferida | 'magia';

const MASCOT_SPRITE_SRC: Record<MascotSpriteWeapon, string> = {
  arco: '/assets/patrol-mascot-arco.png',
  espada: '/assets/patrol-mascot-espada.png',
  magia: '/assets/patrol-mascot-magia.png',
};

const MASCOT_SPRITE_SRC_FEMALE: Record<MascotSpriteWeapon, string> = {
  arco: '/assets/patrol-mascot-female-arco.png',
  espada: '/assets/patrol-mascot-female-espada.png',
  magia: '/assets/patrol-mascot-female-magia.png',
};

const MASCOT_SPRITE_SRC_VILLAGE = '/assets/patrol-mascot-village.png';
const MASCOT_SPRITE_SRC_VILLAGE_FEMALE = '/assets/patrol-mascot-female-village.png';

interface Props {
  weapon: MascotSpriteWeapon;
  attacking: boolean;
  attackSeq: number;
  isCrit?: boolean;
  genero?: PersonagemGenero;
  /** Enquanto procura o próximo inimigo (lupa), o herói troca pro sprite
      "parado" da vila em vez do sprite de combate com a arma em riste. */
  searching?: boolean;
  defeated?: boolean;
  hit?: boolean;
}

export function AfkMascotHero({
  weapon,
  attacking,
  attackSeq,
  isCrit = false,
  genero = 'masculino',
  searching = false,
  defeated = false,
  hit = false,
}: Props) {
  const feminino = genero === 'feminino';
  const useVillageSprite = searching || defeated;
  const spriteSrc = useVillageSprite
    ? feminino
      ? MASCOT_SPRITE_SRC_VILLAGE_FEMALE
      : MASCOT_SPRITE_SRC_VILLAGE
    : feminino
      ? MASCOT_SPRITE_SRC_FEMALE[weapon]
      : MASCOT_SPRITE_SRC[weapon];
  const heroClass = [
    'game-afk-mascot',
    `game-afk-mascot--${weapon}`,
    searching ? 'game-afk-mascot--searching' : '',
    attacking ? 'game-afk-mascot--attack' : 'game-afk-mascot--idle',
    attacking && isCrit ? 'game-afk-mascot--crit' : '',
    defeated ? 'game-afk-mascot--defeated' : '',
    hit ? 'game-afk-mascot--hit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={attackSeq} className={heroClass} aria-hidden>
      <div className="game-afk-mascot__shadow" />
      <div className="game-afk-mascot__figure">
        <img src={spriteSrc} alt="" className="game-afk-mascot__sprite-img" draggable={false} />
        {defeated ? (
          <span className="game-afk-mascot__stun" aria-hidden>
            <i>★</i>
            <i>✦</i>
            <i>★</i>
          </span>
        ) : null}
        {!searching && weapon === 'magia' && attacking && (
          <span key={`magic-${attackSeq}`} className="game-afk-mascot__magic-burst" aria-hidden />
        )}
        {!searching && weapon === 'arco' && attacking && (
          <span
            key={`bow-flash-${attackSeq}`}
            className={`game-afk-mascot__bow-release${isCrit ? ' game-afk-mascot__bow-release--crit' : ''}`}
            aria-hidden
          />
        )}
        {!searching && weapon === 'espada' && attacking && (
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
