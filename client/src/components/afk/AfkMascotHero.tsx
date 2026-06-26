import type { ArmaPreferida } from '@/types';

interface Props {
  weapon: ArmaPreferida;
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

  const bowRigClass = [
    'game-afk-mascot__bow-rig',
    attacking ? 'game-afk-mascot__bow-rig--shoot' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={attackSeq} className={heroClass} aria-hidden>
      <div className="game-afk-mascot__shadow" />
      <div className="game-afk-mascot__cape" />
      <div className="game-afk-mascot__legs">
        <span className="game-afk-mascot__leg game-afk-mascot__leg--l" />
        <span className="game-afk-mascot__leg game-afk-mascot__leg--r" />
      </div>
      <div className="game-afk-mascot__torso">
        <div className="game-afk-mascot__belt" />
        <div className="game-afk-mascot__core-emblem" />
        <div className="game-afk-mascot__neck" />
        <div className="game-afk-mascot__head">
          <svg className="game-afk-mascot__profile" viewBox="0 0 36 40" aria-hidden>
            <path
              d="M4 30 C2 22 4 12 10 8 C14 5 20 5 24 8 C28 11 30 18 28 26 C26 32 20 35 12 34 C8 33 5 32 4 30 Z"
              fill="#92400e"
            />
            <path
              d="M6 30 C5 22 7 13 12 9 C16 6 22 7 26 11 C29 15 29 22 27 28 C25 33 19 35 13 34 C9 33 7 32 6 30 Z"
              fill="#fde68a"
              stroke="#1c1917"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <ellipse cx="9" cy="19" rx="2.2" ry="2.8" fill="#fde68a" stroke="#1c1917" strokeWidth="1.2" />
            <ellipse cx="22" cy="15" rx="2.6" ry="3" fill="#fff" stroke="#1c1917" strokeWidth="1.2" />
            <circle cx="22.8" cy="15.2" r="1.35" fill="#1c1917" />
            <circle cx="23.4" cy="14.5" r="0.45" fill="#fff" />
            <path
              d="M25 19 Q28 21 25.5 22.5"
              fill="none"
              stroke="#1c1917"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <ellipse cx="19" cy="20" rx="2.2" ry="1.1" fill="rgba(251,113,133,0.35)" />
          </svg>
          <div className="game-afk-mascot__cap">
            <span className="game-afk-mascot__cap-badge">A</span>
          </div>
        </div>
      </div>
      <div className="game-afk-mascot__arm game-afk-mascot__arm--back" />

      {weapon === 'arco' ? (
        <div className={bowRigClass}>
          <svg className="game-afk-mascot__bow-svg" viewBox="0 0 64 52" aria-hidden>
            <path
              className="game-afk-mascot__bow-limb"
              d="M16 6 Q50 26 16 46"
              fill="none"
              stroke="#5c4033"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              className="game-afk-mascot__bow-limb-inner"
              d="M16 6 Q50 26 16 46"
              fill="none"
              stroke="#a16207"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.55"
            />
            <rect x="11" y="22" width="10" height="8" rx="1.5" fill="#78350f" stroke="#1c1917" strokeWidth="1" />
            <path
              className="game-afk-mascot__bow-string"
              d="M16 6 L16 26 L16 46"
              fill="none"
              stroke="#e7e5e4"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              className="game-afk-mascot__bow-arrow-nocked"
              x1="16"
              y1="26"
              x2="34"
              y2="26"
              stroke="#78350f"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <polygon
              className="game-afk-mascot__bow-arrow-head"
              points="34,26 30,23.5 30,28.5"
              fill="#fbbf24"
              stroke="#1c1917"
              strokeWidth="0.8"
            />
            <path
              className="game-afk-mascot__bow-feather"
              d="M18 26 L14 24 M18 26 L14 28"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          {attacking && (
            <span key={`arrow-${attackSeq}`} className="game-afk-mascot__arrow-shot" aria-hidden />
          )}
        </div>
      ) : (
        <div className="game-afk-mascot__arm game-afk-mascot__arm--front">
          <div className="game-afk-mascot__sword">
            <span className="game-afk-mascot__sword-blade" />
            <span className="game-afk-mascot__sword-guard" />
            <span className="game-afk-mascot__sword-handle" />
          </div>
        </div>
      )}

      {weapon === 'arco' && <div className="game-afk-mascot__arm game-afk-mascot__arm--draw" />}
    </div>
  );
}
