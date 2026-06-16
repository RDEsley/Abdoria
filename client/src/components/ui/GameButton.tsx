import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { playClick } from '@/lib/sounds';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg' | 'sm';
}

const variants = {
  primary: 'game-btn game-btn--primary',
  secondary: 'game-btn game-btn--secondary',
  ghost: 'game-btn game-btn--ghost',
  danger: 'game-btn game-btn--danger',
};

const sizes = {
  sm: 'game-btn--sm',
  md: '',
  lg: 'game-btn--lg',
};

export function GameButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${variants[variant]} ${sizes[size]} ${className}`.trim()}
      onClick={(e) => {
        playClick();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
