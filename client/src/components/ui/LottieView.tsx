import { useLottie } from 'lottie-react';

/** Renderiza um JSON Lottie já carregado (ver `useLottieAsset`) — fonte única pro app inteiro. */
export function LottieView({ data, loop }: { data: unknown | null; loop: boolean }) {
  const { View } = useLottie(
    { animationData: data ?? undefined, loop },
    { width: '100%', height: '100%' },
  );
  return View;
}
