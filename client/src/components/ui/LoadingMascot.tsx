import { useLottie } from 'lottie-react';
import { useLottieAsset } from '@/hooks/useLottieAsset';

const LOADING_LOTTIE_URL = '/assets/loading.json';

function LottieView({ data }: { data: unknown | null }) {
  const { View } = useLottie(
    { animationData: data ?? undefined, loop: true },
    { width: '100%', height: '100%' },
  );
  return View;
}

export function LoadingMascot({ className = '' }: { className?: string }) {
  const data = useLottieAsset(LOADING_LOTTIE_URL);

  return (
    <div
      className={[
        'flex items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {data ? (
        <div className="h-full w-full p-1.5">
          <LottieView data={data} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="h-7 w-7 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
