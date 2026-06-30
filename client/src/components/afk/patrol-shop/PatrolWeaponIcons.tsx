import { useId, type CSSProperties } from 'react';

interface IconProps {
  className?: string;
  style?: CSSProperties;
  /** ID da arma (`arco_elfico`, `espada_dragao`, etc.) para paleta visual. */
  variant?: string;
}

const INK = '#1c1917';

function weaponLevel(variant?: string): number {
  const match = variant?.match(/_(\d+)$/);
  return match ? Number(match[1]) : 1;
}

type BowPalette = {
  limbA: string;
  limbB: string;
  grip: string;
  string: string;
  arrow: string;
  fletch: string;
  tip: string;
  glow?: string;
};

type SwordPalette = {
  bladeA: string;
  bladeB: string;
  edge: string;
  guard: string;
  guardB: string;
  grip: string;
  gripWrap: string;
  pommel: string;
  rune?: string;
  glow?: string;
};

function bowPalette(variant?: string): BowPalette {
  const level = weaponLevel(variant);
  if (level >= 10) {
    return {
      limbA: '#f0abfc',
      limbB: '#5b21b6',
      grip: '#2e1065',
      string: '#fae8ff',
      arrow: '#ede9fe',
      fletch: '#7c3aed',
      tip: '#fef08a',
      glow: 'rgba(217, 70, 239, 0.7)',
    };
  }
  if (level >= 8) {
    return {
      limbA: '#1e293b',
      limbB: '#0f172a',
      grip: '#334155',
      string: '#94a3b8',
      arrow: '#64748b',
      fletch: '#475569',
      tip: '#cbd5e1',
      glow: 'rgba(100, 116, 139, 0.35)',
    };
  }
  if (level >= 6) {
    return {
      limbA: '#fb923c',
      limbB: '#dc2626',
      grip: '#292524',
      string: '#fef3c7',
      arrow: '#fbbf24',
      fletch: '#b91c1c',
      tip: '#fde047',
      glow: 'rgba(251, 146, 60, 0.55)',
    };
  }
  if (level >= 4) {
    return {
      limbA: '#38bdf8',
      limbB: '#0284c7',
      grip: '#0c4a6e',
      string: '#e0f2fe',
      arrow: '#7dd3fc',
      fletch: '#0369a1',
      tip: '#bae6fd',
      glow: 'rgba(56, 189, 248, 0.35)',
    };
  }
  if (level >= 3) {
    return {
      limbA: '#34d399',
      limbB: '#059669',
      grip: '#fde68a',
      string: '#ecfdf5',
      arrow: '#6ee7b7',
      fletch: '#047857',
      tip: '#fcd34d',
      glow: 'rgba(52, 211, 153, 0.45)',
    };
  }
  if (level >= 2) {
    return {
      limbA: '#92400e',
      limbB: '#78350f',
      grip: '#44403c',
      string: '#e7e5e4',
      arrow: '#78716c',
      fletch: '#57534e',
      tip: '#a8a29e',
    };
  }
  return {
    limbA: '#a16207',
    limbB: '#713f12',
    grip: '#78716c',
    string: '#fafaf9',
    arrow: '#57534e',
    fletch: '#854d0e',
    tip: '#d6d3d1',
  };
}

function swordPalette(variant?: string): SwordPalette {
  const level = weaponLevel(variant);
  if (level >= 10) {
    return {
      bladeA: '#f0abfc',
      bladeB: '#6d28d9',
      edge: '#fdf4ff',
      guard: '#3b0764',
      guardB: '#1e1b4b',
      grip: '#2e1065',
      gripWrap: '#7c3aed',
      pommel: '#e879f9',
      rune: '#f5d0fe',
      glow: 'rgba(217, 70, 239, 0.6)',
    };
  }
  if (level >= 9) {
    return {
      bladeA: '#fde047',
      bladeB: '#f97316',
      edge: '#fffbeb',
      guard: '#b91c1c',
      guardB: '#7f1d1d',
      grip: '#451a03',
      gripWrap: '#78350f',
      pommel: '#ef4444',
      glow: 'rgba(249, 115, 22, 0.5)',
    };
  }
  if (level >= 7) {
    return {
      bladeA: '#fcd34d',
      bladeB: '#d97706',
      edge: '#fffbeb',
      guard: '#b45309',
      guardB: '#92400e',
      grip: '#451a03',
      gripWrap: '#78350f',
      pommel: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.35)',
    };
  }
  if (level >= 5) {
    return {
      bladeA: '#94a3b8',
      bladeB: '#334155',
      edge: '#f8fafc',
      guard: '#1e293b',
      guardB: '#0f172a',
      grip: '#292524',
      gripWrap: '#44403c',
      pommel: '#64748b',
    };
  }
  if (level >= 3) {
    return {
      bladeA: '#93c5fd',
      bladeB: '#3b82f6',
      edge: '#eff6ff',
      guard: '#6366f1',
      guardB: '#4338ca',
      grip: '#312e81',
      gripWrap: '#1e1b4b',
      pommel: '#818cf8',
      rune: '#c7d2fe',
      glow: 'rgba(99, 102, 241, 0.4)',
    };
  }
  if (level >= 2) {
    return {
      bladeA: '#94a3b8',
      bladeB: '#64748b',
      edge: '#e2e8f0',
      guard: '#475569',
      guardB: '#334155',
      grip: '#44403c',
      gripWrap: '#292524',
      pommel: '#57534e',
    };
  }
  return {
    bladeA: '#e2e8f0',
    bladeB: '#94a3b8',
    edge: '#f8fafc',
    guard: '#ca8a04',
    guardB: '#a16207',
    grip: '#78350f',
    gripWrap: '#57534e',
    pommel: '#d97706',
  };
}

// Recurve bow limb path: from left string-attachment → left recurve hook (dips to y≈46) →
// main arc peaking at y≈15 at center → right recurve hook → right string-attachment.
const BOW_ARC =
  'M11 37 C9 37,7 40,8 43 C9 46,13 46,14 38 C14 7,50 7,50 38 C51 46,55 46,56 43 C57 40,55 37,53 37';

/** Arco recurvo estilizado — variantes por tier de arma. */
export function PatrolBowIcon({ className, variant, style }: IconProps) {
  const uid = useId().replace(/:/g, '');
  const p = bowPalette(variant);
  const lvl = weaponLevel(variant);

  return (
    <svg viewBox="0 0 64 48" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-limb`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.limbA} />
          <stop offset="100%" stopColor={p.limbB} />
        </linearGradient>
        <linearGradient id={`${uid}-arrow`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={p.arrow} />
          <stop offset="100%" stopColor={p.tip} />
        </linearGradient>
        {p.glow && (
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        )}
      </defs>

      {p.glow && <ellipse cx="32" cy="24" rx="28" ry="20" fill={`url(#${uid}-glow)`} />}

      {/* Limb shadow */}
      <path
        d={BOW_ARC}
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.2"
        transform="translate(0.7,0.9)"
      />

      {/* Limb — thick gradient stroke for visible depth */}
      <path d={BOW_ARC} fill="none" stroke={`url(#${uid}-limb)`} strokeWidth="6.5" strokeLinecap="round" />
      {/* Limb outline */}
      <path d={BOW_ARC} fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
      {/* Inner belly shadow — slightly offset path to suggest cross-section */}
      <path
        d="M13 37 C11 10,51 10,51 37"
        fill="none"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Front face highlight */}
      <path
        d="M16 15 C23 9, 41 9, 48 15"
        fill="none"
        stroke="#fff"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.38"
      />

      {/* Riser / grip */}
      <rect x="26" y="32" width="12" height="9" rx="2" fill={p.grip} stroke={INK} strokeWidth="1.5" />
      <line x1="27" y1="34.5" x2="37" y2="34.5" stroke="#fff" strokeWidth="0.75" opacity="0.25" />
      <line x1="27" y1="37.5" x2="37" y2="37.5" stroke="#fff" strokeWidth="0.6" opacity="0.18" />
      <line x1="26.5" y1="36" x2="38.5" y2="36" stroke={INK} strokeWidth="0.85" opacity="0.22" />

      {/* Bowstring */}
      <path
        d="M11 37 Q32 19, 53 37"
        fill="none"
        stroke={p.string}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11 37 Q32 19, 53 37"
        fill="none"
        stroke={INK}
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Arrow shaft */}
      <line x1="15" y1="33" x2="50" y2="12" stroke={`url(#${uid}-arrow)`} strokeWidth="2.4" strokeLinecap="round" />

      {/* Broadhead arrowhead (4-point) */}
      <path
        d="M50 12 L56 7 L53 12 L56 17 Z"
        fill={p.tip}
        stroke={INK}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* 3-vane fletching */}
      <path d="M17 32 L11 27 L15 34 Z" fill={p.fletch} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M19 34 L13 33 L16 38 Z" fill={p.fletch} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M15 31 L9 29 L13 34 Z" fill={p.fletch} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" opacity="0.62" />

      {/* Nock V */}
      <path d="M15 32 L13 30 M15 33 L17 36" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />

      {lvl >= 6 && (
        <>
          <circle cx="43" cy="17" r="2.2" fill="#fde047" opacity="0.85" />
          <circle cx="37" cy="22" r="1.4" fill="#fb923c" opacity="0.7" />
        </>
      )}
      {lvl >= 3 && lvl < 6 && (
        <circle cx="33" cy="20" r="1.6" fill="#ecfdf5" opacity="0.9" />
      )}
      {lvl >= 10 && (
        <path
          d="M50 5 L51.2 9 L55 10 L51.2 11 L50 15 L48.8 11 L45 10 L48.8 9 Z"
          fill="#fef9c3"
          stroke="#fde047"
          strokeWidth="0.5"
          opacity="0.95"
        />
      )}
    </svg>
  );
}

/** Espada longa estilizada — variantes por tier de arma. */
export function PatrolSwordIcon({ className, variant, style }: IconProps) {
  const uid = useId().replace(/:/g, '');
  const p = swordPalette(variant);
  const lvl = weaponLevel(variant);

  return (
    <svg viewBox="0 0 48 64" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-blade`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={p.edge} />
          <stop offset="30%" stopColor={p.bladeA} />
          <stop offset="100%" stopColor={p.bladeB} />
        </linearGradient>
        <linearGradient id={`${uid}-guard`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={p.guardB} />
          <stop offset="50%" stopColor={p.guard} />
          <stop offset="100%" stopColor={p.guardB} />
        </linearGradient>
        {p.glow && (
          <radialGradient id={`${uid}-glow`} cx="50%" cy="35%" r="45%">
            <stop offset="0%" stopColor={p.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        )}
      </defs>

      {p.glow && <ellipse cx="24" cy="22" rx="18" ry="24" fill={`url(#${uid}-glow)`} />}

      {/* Blade shadow */}
      <polygon
        points="24,5 29,14 28.5,36 19.5,36 19,14"
        fill={INK}
        opacity="0.13"
        transform="translate(0.8,0.8)"
      />

      {/* Blade — wide taper: shoulder at ±5 from center, base at ±4.5 */}
      <polygon
        points="24,5 29,14 28.5,36 19.5,36 19,14"
        fill={`url(#${uid}-blade)`}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      {/* Fuller (center groove) */}
      <line x1="24" y1="10" x2="24" y2="32" stroke={INK} strokeWidth="0.85" opacity="0.22" />
      <line x1="24" y1="10" x2="24" y2="32" stroke="#fff" strokeWidth="0.7" opacity="0.55" />

      {/* Right bevel edge highlight */}
      <line x1="25.8" y1="12" x2="26.2" y2="31" stroke="#fff" strokeWidth="0.8" opacity="0.42" strokeLinecap="round" />

      {/* Rune marks */}
      {p.rune && (
        <>
          <circle cx="24" cy="15" r="2" fill="none" stroke={p.rune} strokeWidth="0.85" opacity="0.9" />
          <circle cx="24" cy="15" r="0.7" fill={p.rune} opacity="0.9" />
          <line x1="22" y1="21" x2="26" y2="21" stroke={p.rune} strokeWidth="0.9" opacity="0.8" />
          <line x1="24" y1="19" x2="24" y2="23" stroke={p.rune} strokeWidth="0.9" opacity="0.8" />
          <path d="M22.5 27 L24 25 L25.5 27 M22.5 29 L25.5 29" fill="none" stroke={p.rune} strokeWidth="0.8" opacity="0.72" />
        </>
      )}

      {/* Guard — hexagonal with pointed wing tips */}
      <path
        d="M5 37.5 L9 33.5 L39 33.5 L43 37.5 L39 41.5 L9 41.5 Z"
        fill={`url(#${uid}-guard)`}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* Guard top highlight */}
      <line x1="9.5" y1="35" x2="38.5" y2="35" stroke="#fff" strokeWidth="0.7" opacity="0.28" />
      {/* Wing-tip jewels */}
      <circle cx="7" cy="37.5" r="2" fill={p.guardB} stroke={INK} strokeWidth="0.9" />
      <circle cx="41" cy="37.5" r="2" fill={p.guardB} stroke={INK} strokeWidth="0.9" />

      {/* Grip */}
      <rect x="19" y="42" width="10" height="13" rx="1.5" fill={p.grip} stroke={INK} strokeWidth="1.5" />
      {/* Leather wrap */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="19.5"
          y1={44 + i * 2.8}
          x2="28.5"
          y2={44 + i * 2.8}
          stroke={p.gripWrap}
          strokeWidth="1.7"
          opacity="0.88"
        />
      ))}
      <line x1="19.5" y1="43" x2="28.5" y2="43" stroke="#fff" strokeWidth="0.5" opacity="0.25" />

      {/* Pommel — diamond shape */}
      <path
        d="M24 55 L29 59 L24 63 L19 59 Z"
        fill={p.pommel}
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="24" y1="55" x2="24" y2="63" stroke={INK} strokeWidth="0.55" opacity="0.2" />
      <line x1="19" y1="59" x2="29" y2="59" stroke={INK} strokeWidth="0.55" opacity="0.2" />
      <path d="M21 58.5 L24 55 L27 58.5" fill="#fff" opacity="0.28" />

      {lvl >= 9 && (
        <path d="M20 44 L24 48 L28 44" fill="none" stroke="#fde047" strokeWidth="0.9" opacity="0.65" />
      )}
      {lvl >= 10 && (
        <path
          d="M24 1 L25.2 5 L29 6 L25.2 7 L24 11 L22.8 7 L19 6 L22.8 5 Z"
          fill="#fef9c3"
          stroke="#f5d0fe"
          strokeWidth="0.5"
          opacity="0.95"
        />
      )}
    </svg>
  );
}

/** Ícone compacto para abas e placas — delega ao arco/espada padrão da categoria. */
export function PatrolBowTabIcon({ className }: { className?: string }) {
  return <PatrolBowIcon className={className} variant="arco_03" />;
}

export function PatrolSwordTabIcon({ className }: { className?: string }) {
  return <PatrolSwordIcon className={className} variant="espada_03" />;
}

export function patrolWeaponIconStyle(kind: 'arco' | 'espada', variant?: string): CSSProperties | undefined {
  const level = weaponLevel(variant);
  if (level >= 10) {
    return { filter: 'drop-shadow(0 0 6px rgba(217, 70, 239, 0.55))' };
  }
  if (kind === 'arco' && level >= 6) {
    return { filter: 'drop-shadow(0 0 4px rgba(251, 146, 60, 0.35))' };
  }
  if (kind === 'arco' && level >= 3) {
    return { filter: 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.3))' };
  }
  if (kind === 'espada' && level >= 9) {
    return { filter: 'drop-shadow(0 0 5px rgba(249, 115, 22, 0.4))' };
  }
  if (kind === 'espada' && level >= 3) {
    return { filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.35))' };
  }
  return undefined;
}
