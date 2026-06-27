import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';

function GameBird({ className }: { className: string }) {
  return (
    <span className={`game-bird ${className}`} aria-hidden>
      <span className="game-bird__wing game-bird__wing--l" />
      <span className="game-bird__wing game-bird__wing--r" />
    </span>
  );
}

function GameTree({ className, variant = 'round' }: { className: string; variant?: 'round' | 'oak' | 'sapling' }) {
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

  if (variant === 'sapling') {
    return (
      <div className={`game-tree game-tree--sapling ${className}`} aria-hidden>
        <div className="game-tree__sapling-top" />
        <div className="game-tree__sapling-mid" />
        <div className="game-tree__trunk game-tree__trunk--thin" />
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

function GameBush({ className }: { className: string }) {
  return (
    <div className={`game-bush ${className}`} aria-hidden>
      <span className="game-bush__leaf game-bush__leaf--1" />
      <span className="game-bush__leaf game-bush__leaf--2" />
      <span className="game-bush__leaf game-bush__leaf--3" />
    </div>
  );
}

interface GameAuthPanelProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function GameAuthPanel({ title, children, footer, className }: GameAuthPanelProps) {
  return (
    <main className={`game-login__panel${className ? ` ${className}` : ''}`}>
      <BrandMark size={112} alt="Abdoria" className="game-login__logo" />
      <h1 className="game-login__title">{title}</h1>
      {children}
      {footer}
    </main>
  );
}

export function GameAuthScene({ children }: { children: ReactNode }) {
  return (
    <div className="game-login">
      <div className="game-login__sky" aria-hidden>
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
          <GameTree className="game-tree--3" variant="sapling" />
          <GameBush className="game-bush--1" />
          <GameBush className="game-bush--2" />
          <GameBush className="game-bush--3" />
          <GameBush className="game-bush--4" />
          <GameBush className="game-bush--5" />
          <span className="game-rock game-rock--1" />
          <span className="game-rock game-rock--2" />
        </div>
        <div className="game-login__dirt" />
        <div className="game-login__grass" />
      </div>
    </div>
  );
}
