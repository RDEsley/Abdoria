import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Listener = (message: string) => void;

let notify: Listener | null = null;

export function showPreferenceFeedback(message: string): void {
  notify?.(message);
}

export function PreferenceFeedbackHost() {
  const [message, setMessage] = useState<string | null>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    notify = (next) => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setMessage(next);
      hideTimerRef.current = window.setTimeout(() => setMessage(null), 2600);
    };
    return () => {
      notify = null;
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!message) return null;

  return createPortal(
    <div className="game-pref-feedback" role="status" aria-live="polite">
      {message}
    </div>,
    document.body,
  );
}

export const EXERCISE_PIN_ON = 'Exercício marcado para sempre incluir nas recomendações.';
export const EXERCISE_PIN_OFF = 'Exercício removido da lista de sempre incluir.';
export const EXERCISE_BLOCK_ON = 'Exercício não será mais recomendado.';
export const EXERCISE_BLOCK_OFF = 'Exercício voltará a aparecer nas recomendações.';

export const WORKOUT_PIN_ON = 'Este treino será sempre recomendado.';
export const WORKOUT_PIN_OFF = 'Treino removido das recomendações fixas.';
export const WORKOUT_BLOCK_ON = 'Este treino não será mais sugerido.';
export const WORKOUT_BLOCK_OFF = 'Treino voltará a ser sugerido.';
