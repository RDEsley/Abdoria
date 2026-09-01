export type GameToastVariant = 'success' | 'error' | 'warn' | 'info';

export interface GameToastOptions {
  variant?: GameToastVariant;
  duration?: number;
}

export interface GameToastPayload {
  id: number;
  message: string;
  variant: GameToastVariant;
  duration: number;
}

type Listener = (payload: GameToastPayload) => void;

const DEFAULT_DURATION: Record<GameToastVariant, number> = {
  success: 2400,
  error: 3200,
  warn: 3200,
  info: 2600,
};

let listener: Listener | null = null;
let toastSequence = 0;

export function setGameToastListener(nextListener: Listener | null): void {
  listener = nextListener;
}

export function showGameToast(message: string, options?: GameToastOptions): void {
  const variant = options?.variant ?? 'success';
  listener?.({
    id: ++toastSequence,
    message,
    variant,
    duration: options?.duration ?? DEFAULT_DURATION[variant],
  });
}

export const EXERCISE_PIN_ON = 'Exercício marcado para sempre incluir nas recomendações.';
export const EXERCISE_PIN_OFF = 'Exercício removido da lista de sempre incluir.';
export const EXERCISE_BLOCK_ON = 'Exercício não será mais recomendado.';
export const EXERCISE_BLOCK_OFF = 'Exercício voltará a aparecer nas recomendações.';
export const WORKOUT_PIN_ON = 'Este treino será sempre recomendado.';
export const WORKOUT_PIN_OFF = 'Treino removido das recomendações fixas.';
export const WORKOUT_BLOCK_ON = 'Este treino não será mais sugerido.';
export const WORKOUT_BLOCK_OFF = 'Treino voltará a ser sugerido.';
