import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Grip, Settings2, X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { ExerciseVideoModal } from '@/components/library/ExerciseVideoModal';
import { ExerciseQuickActions } from '@/components/library/PreferenceToggleButtons';
import type { IExerciseDocument, WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleTag } from '@/components/builder/MuscleTag';

interface Props {
  id: string;
  item: WorkoutQueueItem;
  index: number;
  exercise?: IExerciseDocument;
  onRemove?: () => void;
  onConfigure?: () => void;
}

export function SortableExerciseItem({ id, item, index, exercise, onRemove, onConfigure }: Props) {
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
          'flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 transition-all',
          isDragging
            ? 'scale-[1.02] rotate-1 shadow-xl ring-2 ring-emerald-300/60'
            : 'shadow-[0_4px_16px_rgba(28,25,23,0.05)]',
        ].join(' ')}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-7 cursor-grab touch-none items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
          >
            <Grip size={18} aria-hidden />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-black text-emerald-700">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500"
              aria-label="Remover exercício"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pl-9">
          <ExerciseQuickActions
            showPlay={Boolean(exercise)}
            onPlay={exercise ? () => setShowVideo(true) : undefined}
          />
          {onConfigure && (
            <GameButton
              type="button"
              variant="secondary"
              size="sm"
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl"
              onClick={onConfigure}
            >
              <Settings2 size={14} aria-hidden /> Configurar
            </GameButton>
          )}
        </div>
      </li>

      {showVideo && exercise && (
        <ExerciseVideoModal exercise={exercise} onClose={() => setShowVideo(false)} />
      )}
    </>
  );
}
