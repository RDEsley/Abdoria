import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, WifiOff } from 'lucide-react';

export type GameToastVariant = 'success' | 'error' | 'warn' | 'info';

const BANNER_ICONS: Record<GameToastVariant, typeof AlertCircle> = {
  success: CheckCircle2,
  error: AlertCircle,
  warn: WifiOff,
  info: Info,
};

interface GameAlertBannerProps {
  variant: GameToastVariant;
  title?: string;
  message: string;
  /** Anuncia imediatamente para leitores de tela (ex.: erro de envio de formulário). */
  live?: boolean;
  id?: string;
}

/** Modo banner do feedback do app — fica fixo no layout (não flutua nem some sozinho),
    para alertas que precisam continuar visíveis enquanto o usuário resolve o formulário. */
export function GameAlertBanner({
  variant,
  title,
  message,
  live = false,
  id,
}: GameAlertBannerProps) {
  if (!message) return null;

  const Icon = BANNER_ICONS[variant];

  return (
    <div
      id={id}
      className={`game-toast-banner game-toast-banner--${variant}`}
      role="alert"
      aria-live={live ? 'assertive' : 'polite'}
    >
      <Icon className="game-toast-banner__icon" size={18} strokeWidth={2.25} aria-hidden />
      <div className="game-toast-banner__body">
        {title && <p className="game-toast-banner__title">{title}</p>}
        <p className="game-toast-banner__message">{message}</p>
      </div>
    </div>
  );
}

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
