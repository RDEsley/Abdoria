import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BrandMark } from '@/components/brand/BrandMark';

interface RegisterCelebrationProps {
  onDone: () => void;
}

/** Transição curta após criar a conta — não exige toque. */
export function RegisterCelebration({ onDone }: RegisterCelebrationProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduceMotion ? 80 : 700);
    return () => window.clearTimeout(timer);
  }, [onDone, reduceMotion]);

  return (
    <div className="auth-celebrate" role="status" aria-live="polite">
      <BrandMark size={112} alt="" variant="full" className="auth-celebrate__logo" />
      <p className="auth-celebrate__kicker">Pronto.</p>
      <p className="auth-celebrate__lead">Seu espaço começou a crescer.</p>
    </div>
  );
}
