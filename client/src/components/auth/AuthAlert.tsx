import { useEffect, useRef } from 'react';
import { showGameToast, type GameToastVariant } from '@/components/ui/GameToast';

type AuthAlertVariant = 'error' | 'warn' | 'success' | 'info';

interface AuthAlertProps {
  variant: AuthAlertVariant;
  title?: string;
  message: string;
  /** Anuncia imediatamente para leitores de tela (erros de envio). */
  live?: boolean;
}

/** Dispara toast padronizado na parte inferior — sem UI inline. */
export function AuthAlert({ variant, title, message }: AuthAlertProps) {
  const lastKey = useRef('');

  useEffect(() => {
    if (!message) return;
    const key = `${variant}|${title ?? ''}|${message}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    const text = title ? `${title} — ${message}` : message;
    showGameToast(text, { variant: variant as GameToastVariant });
  }, [variant, title, message]);

  return null;
}
