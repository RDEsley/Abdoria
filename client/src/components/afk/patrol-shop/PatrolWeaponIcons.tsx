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
      limbA: '#c084fc',
      limbB: '#6d28d9',
      grip: '#1e1b4b',
      string: '#f5d0fe',
      arrow: '#e9d5ff',
      fletch: '#a855f7',
      tip: '#fde047',
      glow: 'rgba(168, 85, 247, 0.55)',
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
      bladeA: '#f5d0fe',
      bladeB: '#7e22ce',
      edge: '#faf5ff',
      guard: '#4c1d95',
      guardB: '#312e81',
      grip: '#1e1b4b',
      gripWrap: '#6b21a8',
      pommel: '#c084fc',
      glow: 'rgba(168, 85, 247, 0.5)',
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

/** Arco recurvo estilizado — variantes por tier de arma. */
export function PatrolBowIcon({ className, variant, style }: IconProps) {
  const uid = useId().replace(/:/g, '');
  const p = bowPalette(variant);

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

      {/* Sombra */}
      <path
        d="M12 38 C12 8, 52 8, 52 38"
        fill="none"
        stroke={INK}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.18"
        transform="translate(0.6, 0.8)"
      />

      {/* Limbs */}
      <path
        d="M11 37 C11 7, 53 7, 53 37"
        fill="none"
        stroke={`url(#${uid}-limb)`}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M11 37 C11 7, 53 7, 53 37"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Brilho no limb superior */}
      <path
        d="M16 14 C24 9, 40 9, 48 14"
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Pontas metálicas */}
      <path d="M10 36 L8 39 L12 38 Z" fill={p.tip} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M54 36 L56 39 L52 38 Z" fill={p.tip} stroke={INK} strokeWidth="1" strokeLinejoin="round" />

      {/* Empunhadura */}
      <rect x="29" y="33" width="6" height="7" rx="1.2" fill={p.grip} stroke={INK} strokeWidth="1.4" />
      <line x1="30" y1="35" x2="34" y2="35" stroke="#fff" strokeWidth="0.8" opacity="0.25" />
      <line x1="30" y1="37.5" x2="34" y2="37.5" stroke="#fff" strokeWidth="0.8" opacity="0.2" />

      {/* Corda */}
      <path
        d="M11 37 Q32 18, 53 37"
        fill="none"
        stroke={p.string}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11 37 Q32 18, 53 37"
        fill="none"
        stroke={INK}
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Flecha */}
      <line x1="14" y1="34" x2="50" y2="12" stroke={`url(#${uid}-arrow)`} strokeWidth="2.2" strokeLinecap="round" />
      <polygon points="50,12 58,8 52,16" fill={p.tip} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M16 33 L12 31 L14 36 Z" fill={p.fletch} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M18 35 L14 34 L17 38 Z" fill={p.fletch} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />

      {weaponLevel(variant) >= 6 && (
        <>
          <circle cx="42" cy="16" r="2" fill="#fde047" opacity="0.85" />
          <circle cx="36" cy="22" r="1.2" fill="#fb923c" opacity="0.7" />
        </>
      )}
      {weaponLevel(variant) >= 3 && weaponLevel(variant) < 6 && (
        <circle cx="32" cy="20" r="1.5" fill="#ecfdf5" opacity="0.9" />
      )}
    </svg>
  );
}

/** Espada longa estilizada — variantes por tier de arma. */
export function PatrolSwordIcon({ className, variant, style }: IconProps) {
  const uid = useId().replace(/:/g, '');
  const p = swordPalette(variant);

  return (
    <svg viewBox="0 0 48 64" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-blade`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={p.edge} />
          <stop offset="35%" stopColor={p.bladeA} />
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

      {/* Sombra da lâmina */}
      <path
        d="M24 4 L24 36"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.12"
        transform="translate(0.8, 0.8)"
      />

      {/* Lâmina */}
      <path
        d="M24 3 L20 36 L24 38 L28 36 Z"
        fill={`url(#${uid}-blade)`}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Fuller / canal central */}
      <line x1="24" y1="8" x2="24" y2="32" stroke={INK} strokeWidth="0.9" opacity="0.22" />
      <line x1="24" y1="8" x2="24" y2="32" stroke="#fff" strokeWidth="0.6" opacity="0.45" />

      {/* Brilho lateral */}
      <line x1="22" y1="10" x2="21" y2="30" stroke="#fff" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />

      {/* Runas (espada rúnica) */}
      {p.rune && (
        <>
          <path d="M24 12 L22 16 L26 16 Z" fill={p.rune} opacity="0.85" />
          <rect x="22.5" y="18" width="3" height="1.2" rx="0.3" fill={p.rune} opacity="0.75" />
          <path d="M24 21 L22 24 L26 24 Z" fill={p.rune} opacity="0.7" />
        </>
      )}

      {/* Guarda */}
      <rect x="8" y="36" width="32" height="5" rx="1.5" fill={`url(#${uid}-guard)`} stroke={INK} strokeWidth="1.6" />
      <line x1="10" y1="37.5" x2="38" y2="37.5" stroke="#fff" strokeWidth="0.7" opacity="0.28" />

      {/* Cabo */}
      <rect x="19" y="41" width="10" height="14" rx="1.2" fill={p.grip} stroke={INK} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="19.5"
          y1={43 + i * 2.4}
          x2="28.5"
          y2={43 + i * 2.4}
          stroke={p.gripWrap}
          strokeWidth="1.6"
          opacity="0.85"
        />
      ))}

      {/* Pommel */}
      <circle cx="24" cy="57.5" r="3.2" fill={p.pommel} stroke={INK} strokeWidth="1.5" />
      <circle cx="23" cy="56.5" r="0.9" fill="#fff" opacity="0.35" />

      {weaponLevel(variant) >= 9 && (
        <path d="M20 43 L24 47 L28 43" fill="none" stroke="#fde047" strokeWidth="0.8" opacity="0.6" />
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
  if (level >= 10) {
    return { filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.45))' };
  }
  return undefined;
}
