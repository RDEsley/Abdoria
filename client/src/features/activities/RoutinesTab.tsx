import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { reorderRoutines } from '@/lib/api/activities';
import type { useActivitiesData } from './useActivitiesData';

function SortableRoutineCard({
  routine,
  onClick,
}: {
  routine: { id: string; name: string; items?: unknown[] };
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  });
  const total = routine.items?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-no-nav-swipe
      className="activity-quick-card flex items-center gap-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-stone-400"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        className="activity-quick-card__body flex-1 text-left"
        onClick={onClick}
      >
        <strong>{routine.name}</strong>
        <small>
          {total} {total === 1 ? 'atividade' : 'atividades'}
        </small>
      </button>
    </div>
  );
}

export function RoutinesTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [orderedRoutines, setOrderedRoutines] = useState(data.routines);

  // Sync with data when it changes
  if (data.routines !== orderedRoutines && data.routines.length !== orderedRoutines.length) {
    setOrderedRoutines(data.routines);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderedRoutines.findIndex((r) => r.id === active.id);
      const newIndex = orderedRoutines.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(orderedRoutines, oldIndex, newIndex);
      setOrderedRoutines(next);
      void reorderRoutines(next.map((r) => r.id));
    },
    [orderedRoutines],
  );

  return (
    <div className="flex flex-col gap-3">
      {orderedRoutines.length === 0 && (
        <p className="text-sm font-bold text-stone-600">
          Uma rotina é só um conjunto de atividades na ordem que você quiser.
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3" data-no-nav-swipe>
          <SortableContext
            items={orderedRoutines.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedRoutines.map((routine) => (
              <SortableRoutineCard
                key={routine.id}
                routine={routine}
                onClick={() => navigate(`/rotina/${routine.id}`)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <GameButton
        variant="secondary"
        className="flex items-center justify-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} /> Nova rotina
      </GameButton>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="routine-create-title">
        <div className="p-4">
          <h2 id="routine-create-title" className="game-section-title">
            Nova rotina
          </h2>
          <input
            className="game-input mt-2 w-full"
            maxLength={40}
            placeholder="Ex.: Segunda-feira, Manhã, Pós-treino"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
            {data.activities.map((activity) => {
              const on = selected.includes(activity.id);
              return (
                <li key={activity.id}>
                  <button
                    type="button"
                    className={`activity-template${on ? ' activity-template--on' : ''}`}
                    onClick={() =>
                      setSelected((current) =>
                        on ? current.filter((id) => id !== activity.id) : [...current, activity.id],
                      )
                    }
                  >
                    {activity.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <GameButton
            className="mt-4 w-full"
            disabled={!name.trim() || selected.length === 0}
            onClick={() => {
              void data
                .createRoutine({ name: name.trim(), items: selected })
                .then(() => data.reload())
                .then(() => {
                  setOpen(false);
                  setName('');
                  setSelected([]);
                });
            }}
          >
            Criar rotina
          </GameButton>
        </div>
      </Modal>
    </div>
  );
}
