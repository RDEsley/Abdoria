import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff } from 'lucide-react';
import { showGameToast, type GameToastVariant } from '@/components/ui/GameToast';

type AuthAlertVariant = 'error' | 'warn' | 'success' | 'info';

const ICONS: Record<AuthAlertVariant, typeof AlertCircle> = {
  error: AlertCircle,
  warn: WifiOff,
  success: CheckCircle2,
  info: Info,
};

interface AuthAlertProps {
  variant: AuthAlertVariant;
  title?: string;
  message: string;
  /** Anuncia imediatamente para leitores de tela (erros de envio). */
  live?: boolean;
  /** Se true, também dispara toast na parte inferior. */
  toast?: boolean;
  id?: string;
}

export function AuthAlert({ variant, title, message, live = false, toast = false, id }: AuthAlertProps) {
  const lastToastKey = useRef('');

  useEffect(() => {
    if (!toast || !message) return;
    const key = `${variant}|${title ?? ''}|${message}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;
    const text = title ? `${title} — ${message}` : message;
    showGameToast(text, { variant: variant as GameToastVariant });
  }, [toast, variant, title, message]);

  if (!message) return null;

  const Icon = ICONS[variant];

  return (
    <div
      id={id}
      className={`game-auth-alert game-auth-alert--${variant}`}
      role="alert"
      aria-live={live ? 'assertive' : 'polite'}
    >
      <Icon className="game-auth-alert__icon" size={18} strokeWidth={2.25} aria-hidden />
      <div className="game-auth-alert__body">
        {title && <p className="game-auth-alert__title">{title}</p>}
        <p className="game-auth-alert__message">{message}</p>
      </div>
    </div>
  );
}
