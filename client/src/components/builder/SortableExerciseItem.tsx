import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Grip, X } from 'lucide-react';
import { ExerciseVideoModal } from '@/components/library/ExerciseVideoModal';
import { ExerciseQuickActions } from '@/components/library/PreferenceToggleButtons';
import type { IExerciseDocument, WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleTag } from '@/components/builder/MuscleTag';

const DURATION_OPTIONS = [20, 30, 45, 60, 90, 120] as const;

interface Props {
  id: string;
  item: WorkoutQueueItem;
  index: number;
  exercise?: IExerciseDocument;
  onRemove?: () => void;
  onChangeTempo?: (seconds: number) => void;
  isPinned?: boolean;
  isBlocked?: boolean;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  showPreferences?: boolean;
  showSwapWorkout?: boolean;
  onSwapWorkout?: () => void;
  swapWorkoutDisabled?: boolean;
  showSwapExercise?: boolean;
  onSwapExercise?: () => void;
  swapExerciseDisabled?: boolean;
}

export function SortableExerciseItem({
  id,
  item,
  index,
  exercise,
  onRemove,
  onChangeTempo,
  isPinned = false,
  isBlocked = false,
  onTogglePin,
  onToggleBlock,
  showPreferences = false,
  showSwapWorkout = false,
  onSwapWorkout,
  swapWorkoutDisabled = false,
  showSwapExercise = false,
  onSwapExercise,
  swapExerciseDisabled = false,
}: Props) {
  const [showVideo, setShowVideo] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={[
          'flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 transition-shadow',
          isDragging ? 'scale-[1.02] rotate-1 shadow-lg ring-2 ring-emerald-300/60' : 'shadow-sm',
        ].join(' ')}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none rounded-md p-0.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
          >
            <Grip size={18} aria-hidden />
          </button>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-stone-900">{formatExerciseName(item)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <MuscleTag muscle={item.musculo_principal} compact />
              <span className="text-xs text-stone-500">{formatExercisePrescription(item)}</span>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"
              aria-label="Remover exercício"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pl-9">
          <ExerciseQuickActions
            showPlay={Boolean(exercise)}
            onPlay={exercise ? () => setShowVideo(true) : undefined}
            showSwapExercise={showSwapExercise}
            onSwapExercise={onSwapExercise}
            swapExerciseDisabled={swapExerciseDisabled}
            showSwapWorkout={showSwapWorkout}
            onSwapWorkout={onSwapWorkout}
            swapWorkoutDisabled={swapWorkoutDisabled}
            showPreferences={showPreferences}
            isPinned={isPinned}
            isBlocked={isBlocked}
            onTogglePin={onTogglePin}
            onToggleBlock={onToggleBlock}
          />
        </div>

        {item.modo === 'tempo' && onChangeTempo && (
          <div className="flex flex-wrap items-center gap-1 pl-9">
            <span className="mr-1 text-[0.6rem] font-bold uppercase tracking-wide text-stone-400">
              Duração:
            </span>
            {DURATION_OPTIONS.map((sec) => {
              const current = item.tempo_seg ?? item.tempo_recomendado ?? 30;
              const active = current === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChangeTempo(sec)}
                  className={[
                    'rounded-full border px-2 py-0.5 text-[0.6rem] font-extrabold transition-colors',
                    active
                      ? 'border-emerald-700 bg-emerald-600 text-white'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-400 hover:text-emerald-700',
                  ].join(' ')}
                >
                  {sec < 60 ? `${sec}s` : `${sec / 60}min`}
                </button>
              );
            })}
          </div>
        )}
      </li>

      {showVideo && exercise && (
        <ExerciseVideoModal exercise={exercise} onClose={() => setShowVideo(false)} />
      )}
    </>
  );
}
