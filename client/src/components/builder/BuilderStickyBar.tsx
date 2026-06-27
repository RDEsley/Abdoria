import { Play } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  exerciseCount: number;
  estimatedMinutes: number | null;
  disabled: boolean;
  onStart: () => void;
}

export function BuilderStickyBar({ exerciseCount, estimatedMinutes, disabled, onStart }: Props) {
  const timeLabel =
    estimatedMinutes !== null && exerciseCount > 0
      ? `Tempo estimado: ~${estimatedMinutes} min`
      : 'Tempo estimado: -- min';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-40 md:bottom-0"
      aria-hidden={false}
    >
      <div className="pointer-events-auto mx-auto max-w-lg border-t border-stone-200/80 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md md:max-w-3xl">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-stone-500">{timeLabel}</p>
          <GameButton
            size="lg"
            className="flex shrink-0 items-center justify-center gap-2 px-5"
            onClick={onStart}
            disabled={disabled}
          >
            <Play size={20} fill="currentColor" aria-hidden />
            Iniciar ({exerciseCount})
          </GameButton>
        </div>
      </div>
    </div>
  );
}
