import type { ReactNode } from 'react';
import { Activity, Sparkles, Sprout } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';

interface GameAuthPanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function GameAuthPanel({
  title,
  subtitle,
  children,
  footer,
  className,
}: GameAuthPanelProps) {
  return (
    <main className={`game-login__panel${className ? ` ${className}` : ''}`}>
      {(title || subtitle) && (
        <header className="game-login__panel-heading">
          {title && <h1 className="game-login__title">{title}</h1>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      {children}
      {footer}
    </main>
  );
}

interface GameAuthSceneProps {
  children: ReactNode;
}

export function GameAuthScene({ children }: GameAuthSceneProps) {
  return (
    <div className="game-login">
      <div className="game-login__ambient" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <section className="game-auth-intro" aria-label="Evolyn">
        <BrandMark size={176} alt="Evolyn" variant="full" className="game-auth-intro__logo" />
        <div className="game-auth-intro__copy">
          <p className="game-auth-intro__eyebrow">Seu treino, sua evolução</p>
          <h2>Core forte. Rotina possível.</h2>
          <p>Missões curtas, progresso visível e motivação para continuar no seu ritmo.</p>
        </div>
        <div className="game-auth-intro__features">
          <span>
            <Activity size={16} aria-hidden /> Treinos guiados
          </span>
          <span>
            <Sparkles size={16} aria-hidden /> Progresso real
          </span>
          <span>
            <Sprout size={16} aria-hidden /> MyPlant em breve
          </span>
        </div>
      </section>

      {children}

      <p className="game-login__legal">
        Ao continuar, você concorda com os termos e a privacidade.
      </p>
    </div>
  );
}
