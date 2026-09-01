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
    <div className="workout-queue">
      <div className="workout-queue__header">
        <span className="workout-queue__header-icon">
          <ListChecks size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="workout-queue__title">Sequência do treino</p>
          <p className="workout-queue__subtitle">
            {queue.length} {queue.length === 1 ? 'exercício' : 'exercícios'} · segure para reordenar
          </p>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className="workout-queue__list">
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
