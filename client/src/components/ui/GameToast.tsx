import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type GameToastVariant = 'success' | 'error' | 'warn' | 'info';

export interface GameToastOptions {
  variant?: GameToastVariant;
  duration?: number;
}

interface ToastPayload {
  message: string;
  variant: GameToastVariant;
  duration: number;
}

type Listener = (payload: ToastPayload) => void;

const DEFAULT_DURATION: Record<GameToastVariant, number> = {
  success: 2400,
  error: 3200,
  warn: 3200,
  info: 2600,
};

let notify: Listener | null = null;

export function showGameToast(message: string, options?: GameToastOptions): void {
  const variant = options?.variant ?? 'success';
  notify?.({
    message,
    variant,
    duration: options?.duration ?? DEFAULT_DURATION[variant],
  });
}

/** @deprecated Use showGameToast */
export function showPreferenceFeedback(message: string): void {
  showGameToast(message, { variant: 'success' });
}

export function GameToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    notify = (payload) => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setToast(payload);
      hideTimerRef.current = window.setTimeout(() => setToast(null), payload.duration);
    };
    return () => {
      notify = null;
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!toast) return null;

  return createPortal(
    <div
      className={`game-toast game-toast--${toast.variant}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      {toast.message}
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
