import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** `strong` usa `.glass-panel-strong` (sombra mais pronunciada, para destaques). */
  variant?: 'default' | 'strong';
}

/** Painel padrão do design system — reaproveita `.glass-card`/`.glass-panel-strong` já definidos em theme.css. */
export function Card({ variant = 'default', className = '', children, ...rest }: Props) {
  const base = variant === 'strong' ? 'glass-panel-strong' : 'glass-card';
  return (
    <div className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
