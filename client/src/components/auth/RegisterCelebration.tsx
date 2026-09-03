import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { EvolynSproutMark } from '@/components/auth/EvolynSproutMark';

interface RegisterCelebrationProps {
  onDone: () => void;
}

/** Transição curta após criar a conta — não exige toque. */
export function RegisterCelebration({ onDone }: RegisterCelebrationProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduceMotion ? 80 : 1000);
    return () => window.clearTimeout(timer);
  }, [onDone, reduceMotion]);

  return (
    <div className="auth-celebrate" role="status" aria-live="polite">
      <EvolynSproutMark
        play={reduceMotion ? 'still' : 'short'}
        className="auth-celebrate__sprout"
      />
      <p className="auth-celebrate__kicker">Pronto.</p>
      <p className="auth-celebrate__lead">Seu espaço começou a crescer.</p>
    </div>
  );
}
