/**
 * Política mínima: toast com ação (Desfazer) não é engolido por toasts informativos.
 */
export function shouldAcceptToast(input: {
  hasAction: boolean;
  variant: string;
  now: number;
  stickyUntil: number;
}): boolean {
  if (input.hasAction) return true;
  if (input.variant === 'error') return true;
  return input.now >= input.stickyUntil;
}

export function nextStickyUntil(input: {
  hasAction: boolean;
  now: number;
  duration: number;
}): number {
  return input.hasAction ? input.now + input.duration : 0;
}
