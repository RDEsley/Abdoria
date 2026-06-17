import { AlertCircle, CheckCircle2, Info, WifiOff } from 'lucide-react';

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
}

export function AuthAlert({ variant, title, message, live = false }: AuthAlertProps) {
  const Icon = ICONS[variant];

  return (
    <div
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
