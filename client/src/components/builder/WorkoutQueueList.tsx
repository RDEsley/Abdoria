import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableExerciseItem } from '@/components/builder/SortableExerciseItem';
import type { IExerciseDocument, WorkoutQueueItem } from '@/types';
import { ListChecks } from 'lucide-react';

interface Props {
  queue: WorkoutQueueItem[];
  sortableIds: string[];
  exerciseMap: Map<string, IExerciseDocument>;
  emptyMessage: string;
  onDragEnd: (event: DragEndEvent) => void;
  onConfigureExercise: (index: number) => void;
  onRemove?: (index: number) => void;
}

/** Fila de exercícios reordenável — usada pelas abas Treinar e Personalizar do Builder. */
export function WorkoutQueueList({
  queue,
  sortableIds,
  exerciseMap,
  emptyMessage,
  onDragEnd,
  onConfigureExercise,
  onRemove,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (queue.length === 0) {
    return <p className="text-sm text-stone-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white shadow-[0_12px_36px_rgba(16,185,129,0.08)]">
      <div className="flex items-center gap-3 border-b border-emerald-100/80 px-4 py-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
          <ListChecks size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-stone-900">Fila do treino</p>
          <p className="text-[0.68rem] font-semibold text-stone-500">
            {queue.length} {queue.length === 1 ? 'exercício' : 'exercícios'} · segure para reordenar
          </p>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2 p-3">
            {queue.map((item, index) => (
              <SortableExerciseItem
                key={sortableIds[index]}
                id={sortableIds[index]}
                item={item}
                index={index}
                exercise={exerciseMap.get(item.slug)}
                onConfigure={() => onConfigureExercise(index)}
                onRemove={onRemove ? () => onRemove(index) : undefined}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
