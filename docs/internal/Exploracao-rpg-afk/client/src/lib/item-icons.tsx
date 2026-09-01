import { Zap } from 'lucide-react';

export function FrozenStreakIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-frozen-streak-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="2.5"
          className="game-frozen-streak-icon__cube"
        />
        <path d="M5 12h14M12 5v14" className="game-frozen-streak-icon__facet" strokeWidth="1.4" />
        <path d="M8 8l8 8M16 8l-8 8" className="game-frozen-streak-icon__spark" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

export function RouteDrinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-route-drink-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect x="7" y="3" width="10" height="4" rx="1" className="game-route-drink-icon__cap" />
        <rect x="6" y="7" width="12" height="14" rx="2" className="game-route-drink-icon__body" />
        <path
          d="M12 9v2m0 0c-1.5 0-2.5 1-2.5 2.2 0 1.2 1 2 2.5 2s2.5-.8 2.5-2c0-1.2-1-2.2-2.5-2.2z"
          className="game-route-drink-icon__tree"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 15v2"
          className="game-route-drink-icon__tree"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function ExpInstantIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-exp-instant-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <Zap size={size} strokeWidth={2.4} />
    </span>
  );
}

export function DoriaBagIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-doria-bag-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <path
          d="M8 9c0-2.2 1.8-4 4-4s4 1.8 4 4v1h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2V9z"
          className="game-doria-bag-icon__body"
          strokeWidth="1.6"
        />
        <path
          d="M9 10h6"
          className="game-doria-bag-icon__tie"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="10" cy="15" r="1" className="game-doria-bag-icon__coin" />
        <circle cx="14" cy="16" r="1" className="game-doria-bag-icon__coin" />
      </svg>
    </span>
  );
}
