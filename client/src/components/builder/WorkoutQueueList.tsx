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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
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
  );
}
