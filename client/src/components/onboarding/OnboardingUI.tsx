import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { playClick } from '@/lib/sounds';

/** Cabeçalho padrão de todo passo do onboarding: ícone + título + subtítulo. */
export function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="onb-header">
      <span className="onb-header__icon" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="onb-header__title">{title}</h2>
        {subtitle && <p className="onb-header__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  recommended?: boolean;
  disabled?: boolean;
  className?: string;
  /** Renderiza como item de grade (sem forçar largura total). */
  grid?: boolean;
}

/**
 * Card de opção padrão do onboarding: ícone opcional, título/subtítulo,
 * selo "Recomendado" (quando aplicável) e check animado ao selecionar.
 * Toca um clique curto pra dar feedback tátil a cada escolha.
 */
export function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  recommended = false,
  disabled = false,
  className = '',
  grid = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => {
        playClick();
        onClick();
      }}
      className={`onb-option${selected ? ' onb-option--selected' : ''}${grid ? ' onb-option--grid' : ''}${recommended ? ' onb-option--recommended' : ''} ${className}`.trim()}
    >
      {icon && (
        <span className="onb-option__icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className="onb-option__body">
        <span className="onb-option__title-row">
          <span className="onb-option__title">{title}</span>
          {recommended && (
            <span className="onb-option__badge">
              <Sparkles size={10} aria-hidden /> Recomendado
            </span>
          )}
        </span>
        {subtitle && <span className="onb-option__subtitle">{subtitle}</span>}
      </span>
      <AnimatePresence>
        {selected && (
          <motion.span
            className="onb-option__check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            aria-hidden
          >
            <Check size={13} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Chip compacto pra grades de múltipla escolha simples (partes do corpo, restrições). */
export function Chip({
  selected,
  onClick,
  label,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => {
        playClick();
        onClick();
      }}
      className={`onb-chip${selected ? ' onb-chip--selected' : ''}`}
    >
      {label}
      {selected && <Check size={13} strokeWidth={3} aria-hidden />}
    </button>
  );
}
