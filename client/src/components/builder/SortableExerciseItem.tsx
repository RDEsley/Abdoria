import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';

interface Props {
  id: string;
  item: WorkoutQueueItem;
  index: number;
  onRemove?: () => void;
}

export function SortableExerciseItem({ id, item, index, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
    >
      <button
        type="button"
        className="cursor-grab text-stone-400 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        <GripVertical size={18} />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900">{formatExerciseName(item)}</p>
        <div className="mt-0.5">
          <MuscleZoneLabel muscle={item.musculo_principal} showHint />
          <p className="mt-0.5 text-xs text-stone-500">{formatExercisePrescription(item)}</p>
        </div>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-stone-400 hover:text-red-500" aria-label="Remover">
          <X size={16} />
        </button>
      )}
    </li>
  );
}
