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

interface ExercisePreferences {
  fixedExerciseSlugs: string[];
  blockedExerciseSlugs: string[];
  onTogglePin: (slug: string) => void;
  onToggleBlock: (slug: string) => void;
}

interface Props {
  queue: WorkoutQueueItem[];
  sortableIds: string[];
  exerciseMap: Map<string, IExerciseDocument>;
  emptyMessage: string;
  onDragEnd: (event: DragEndEvent) => void;
  onSwapExercise: (index: number) => void;
  onChangeTempo: (index: number, seconds: number) => void;
  onRemove?: (index: number) => void;
  /** Presente = mostra pin/block por exercício (aba Treinar). */
  preferences?: ExercisePreferences;
}

/** Fila de exercícios reordenável — usada pelas abas Treinar e Personalizar do Builder. */
export function WorkoutQueueList({
  queue,
  sortableIds,
  exerciseMap,
  emptyMessage,
  onDragEnd,
  onSwapExercise,
  onChangeTempo,
  onRemove,
  preferences,
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
              showSwapExercise
              onSwapExercise={() => onSwapExercise(index)}
              onChangeTempo={(sec) => onChangeTempo(index, sec)}
              onRemove={onRemove ? () => onRemove(index) : undefined}
              showPreferences={Boolean(preferences)}
              isPinned={preferences?.fixedExerciseSlugs.includes(item.slug)}
              isBlocked={preferences?.blockedExerciseSlugs.includes(item.slug)}
              onTogglePin={preferences ? () => preferences.onTogglePin(item.slug) : undefined}
              onToggleBlock={preferences ? () => preferences.onToggleBlock(item.slug) : undefined}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
