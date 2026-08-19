import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';

/** Sol (dia) ou lua (noite) com rosto — fecha os olhos e "espia" (cresce um
    pouco, mais presente na tela) quando alguma senha está visível. */
function GameCelestial({ variant, eyesClosed }: { variant: 'day' | 'night'; eyesClosed: boolean }) {
  const kind = variant === 'day' ? 'sun' : 'moon';
  return (
    <span
      className={`game-celestial-mount game-celestial-mount--${kind}${eyesClosed ? ' game-celestial-mount--peek' : ''}`}
    >
      <span
        className={`game-celestial game-celestial--${kind}${eyesClosed ? ' game-celestial--sleep' : ''}`}
        aria-hidden
      >
        {variant === 'day' && <span className="game-celestial__rays" />}
        <span className="game-celestial__face">
          <span className="game-celestial__eye game-celestial__eye--l" />
          <span className="game-celestial__eye game-celestial__eye--r" />
          <span className="game-celestial__mouth" />
        </span>
      </span>
    </span>
  );
}

function GameBird({ className }: { className: string }) {
  return (
    <span className={`game-bird ${className}`} aria-hidden>
      <span className="game-bird__wing game-bird__wing--l" />
      <span className="game-bird__wing game-bird__wing--r" />
    </span>
  );
}

function GameTree({
  className,
  variant = 'round',
}: {
  className: string;
  variant?: 'round' | 'oak';
}) {
  if (variant === 'oak') {
    return (
      <div className={`game-tree game-tree--oak ${className}`} aria-hidden>
        <div className="game-tree__crown">
          <span className="game-tree__blob game-tree__blob--l" />
          <span className="game-tree__blob game-tree__blob--c" />
          <span className="game-tree__blob game-tree__blob--r" />
        </div>
        <div className="game-tree__trunk game-tree__trunk--wide" />
      </div>
    );
  }

  return (
    <div className={`game-tree game-tree--round ${className}`} aria-hidden>
      <div className="game-tree__foliage">
        <span className="game-tree__shine" />
      </div>
      <div className="game-tree__trunk" />
    </div>
  );
}

interface GameAuthPanelProps {
  /** Omitido quando a logo já traz o nome por extenso (ex.: tela de login). */
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** false = sem logo (ex.: cadastro, onde o título já identifica a tela). */
  showLogo?: boolean;
  /** 'lg' = logo bem maior (login) — escala fluida via clamp(), sem quebrar no mobile. */
  logoSize?: 'default' | 'lg';
}

export function GameAuthPanel({
  title,
  children,
  footer,
  className,
  showLogo = true,
  logoSize = 'default',
}: GameAuthPanelProps) {
  return (
    <main className={`game-login__panel${className ? ` ${className}` : ''}`}>
      {showLogo && (
        <BrandMark
          size={logoSize === 'lg' ? 176 : 112}
          alt="Evolyn"
          className={`game-login__logo${logoSize === 'lg' ? ' game-login__logo--lg' : ''}`}
        />
      )}
      {title && <h1 className="game-login__title">{title}</h1>}
      {children}
      {footer}
    </main>
  );
}

interface GameAuthSceneProps {
  children: ReactNode;
  /** Login vive de dia (sol), cadastro à noite (lua). */
  variant?: 'day' | 'night';
}

export function GameAuthScene({ children, variant = 'night' }: GameAuthSceneProps) {
  const [eyesClosed, setEyesClosed] = useState(false);
  const visibleFields = useRef(new Set<string>());

  // Campos de senha avisam quando ficam visíveis — o sol/lua fecha os olhos.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; visible: boolean }>).detail;
      if (!detail) return;
      if (detail.visible) visibleFields.current.add(detail.id);
      else visibleFields.current.delete(detail.id);
      setEyesClosed(visibleFields.current.size > 0);
    };
    window.addEventListener('abdoria:password-visibility', handler);
    return () => window.removeEventListener('abdoria:password-visibility', handler);
  }, []);

  return (
    <div className={`game-login game-login--${variant}`}>
      <div className="game-login__sky" aria-hidden>
        <GameCelestial variant={variant} eyesClosed={eyesClosed} />

        <div className="game-login__clouds game-login__clouds--far">
          <span className="game-cloud game-cloud--f1" />
          <span className="game-cloud game-cloud--f2" />
          <span className="game-cloud game-cloud--f3" />
          <span className="game-cloud game-cloud--f4" />
        </div>

        <GameBird className="game-bird--1" />
        <GameBird className="game-bird--2" />
        <GameBird className="game-bird--3" />

        <div className="game-login__clouds game-login__clouds--near">
          <span className="game-cloud game-cloud--n1" />
          <span className="game-cloud game-cloud--n2" />
          <span className="game-cloud game-cloud--n3" />
          <span className="game-cloud game-cloud--n4" />
          <span className="game-cloud game-cloud--n5" />
        </div>
      </div>

      {children}

      <div className="game-login__ground" aria-hidden>
        <div className="game-login__scenery">
          <GameTree className="game-tree--1" variant="round" />
          <GameTree className="game-tree--2" variant="oak" />
        </div>
        <div className="game-login__dirt" />
        <div className="game-login__grass" />
      </div>
    </div>
  );
}
