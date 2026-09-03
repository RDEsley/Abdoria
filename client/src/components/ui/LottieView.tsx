import { useEffect } from 'react';
import { useLottie } from 'lottie-react';

/** Renderiza um JSON Lottie já carregado (ver `useLottieAsset`) — fonte única pro app inteiro. */
export function LottieView({
  data,
  loop,
  cover = false,
  speed = 1,
  contain = false,
}: {
  data: unknown | null;
  loop: boolean;
  cover?: boolean;
  contain?: boolean;
  speed?: number;
}) {
  const { View, setSpeed } = useLottie(
    {
      animationData: data ?? undefined,
      loop,
      rendererSettings: cover
        ? { preserveAspectRatio: 'xMidYMin slice' }
        : contain
          ? { preserveAspectRatio: 'xMidYMid meet' }
          : undefined,
    },
    { width: '100%', height: '100%' },
  );
  useEffect(() => {
    setSpeed(speed);
  }, [setSpeed, speed]);
  return View;
}
