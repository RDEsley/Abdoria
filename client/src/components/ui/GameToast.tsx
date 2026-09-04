import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, WifiOff } from 'lucide-react';
import {
  setGameToastListener,
  type GameToastPayload,
  type GameToastVariant,
} from '@/lib/game-toast';

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

export function GameToastHost() {
  const { pathname } = useLocation();
  const [toast, setToast] = useState<GameToastPayload | null>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setGameToastListener((payload) => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setToast(payload);
      hideTimerRef.current = window.setTimeout(() => setToast(null), payload.duration);
    });
    return () => {
      setGameToastListener(null);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!toast) return null;
  const Icon = BANNER_ICONS[toast.variant];

  return createPortal(
    <div
      key={toast.id}
      className={`game-toast game-toast--${toast.variant}${pathname === '/player' ? ' game-toast--player' : ''}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="game-toast__icon" size={17} strokeWidth={2.4} aria-hidden />
      <p className="game-toast__message">{toast.message}</p>
      {toast.actionLabel && toast.onAction ? (
        <button
          type="button"
          className="game-toast__action"
          onClick={() => {
            toast.onAction?.();
            setToast(null);
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
