import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, Pencil, Plus } from 'lucide-react';
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
import { reorderRoutines } from '@/lib/api/activities';
import { activityOccursOnDay, routineItemsDoneToday } from '@shared/activities';
import { getMinutesOfDaySaoPaulo, getTodaySaoPaulo } from '@shared/utils/timezone';
import type { ActivityLogRecord, RoutineRecord } from '@shared/activities';
import { RoutineEditorSheet, type RoutineEditorPayload } from './RoutineEditorSheet';
import type { useActivitiesData } from './useActivitiesData';

function SortableRoutineCard({
  routine,
  logs,
  today,
  onClick,
  onEdit,
}: {
  routine: RoutineRecord;
  logs: ActivityLogRecord[];
  today: string;
  onClick: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  });
  const total = routine.items?.length ?? 0;
  const isScheduled = routine.schedule.kind !== 'unscheduled';
  const scheduledToday = isScheduled && activityOccursOnDay(routine.schedule, today);
  const time = routine.schedule.times?.[0] ?? null;
  const isNow = useMemo(() => {
    if (!scheduledToday || !time) return false;
    const [hh, mm] = time.split(':').map(Number);
    return hh * 60 + mm <= getMinutesOfDaySaoPaulo() + 30;
  }, [scheduledToday, time]);
  const doneToday = useMemo(() => {
    const todayLogs = logs.filter((log) => log.day_key === today);
    return routineItemsDoneToday(routine, todayLogs);
  }, [routine, logs, today]);
  const secondary = isScheduled && !scheduledToday;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-no-nav-swipe
      className={`activity-quick-card flex items-center gap-2${secondary ? ' routine-card--secondary' : ''}`}
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
        <span className="flex items-center gap-2">
          <strong>{routine.name}</strong>
          {scheduledToday && (
            <span className={`routine-badge${isNow ? ' routine-badge--now' : ''}`}>
              {isNow ? 'Agora' : 'Hoje'}
            </span>
          )}
        </span>
        <small>
          {total > 0
            ? `${doneToday}/${total}${scheduledToday && time ? ` · ${time}` : ''}`
            : 'Sem atividades'}
        </small>
      </button>
      <button
        type="button"
        className="routine-card__edit"
        aria-label={`Editar ${routine.name}`}
        onClick={onEdit}
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}

export function RoutinesTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<
    { mode: 'create' } | { mode: 'edit'; routine: RoutineRecord } | null
  >(null);
  const today = getTodaySaoPaulo();

  // Só a ORDEM local de arrasto é mantida em estado próprio. Nome, agenda,
  // progresso, arquivamento e criação sempre vêm direto de `data.routines`
  // (fonte da verdade), reconciliados aqui — nunca mutados durante o render.
  const [orderedIds, setOrderedIds] = useState<string[]>(() => data.routines.map((r) => r.id));

  useEffect(() => {
    setOrderedIds((current) => {
      const incomingIds = data.routines.map((r) => r.id);
      const incomingSet = new Set(incomingIds);
      const currentSet = new Set(current);
      const kept = current.filter((id) => incomingSet.has(id));
      const appended = incomingIds.filter((id) => !currentSet.has(id));
      const next = [...kept, ...appended];
      // Evita re-render/loop quando nada realmente mudou de ordem/conjunto.
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [data.routines]);

  const routineById = useMemo(
    () => new Map(data.routines.map((routine) => [routine.id, routine])),
    [data.routines],
  );
  const orderedRoutines = orderedIds
    .map((id) => routineById.get(id))
    .filter((routine): routine is RoutineRecord => Boolean(routine));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderedIds.findIndex((id) => id === active.id);
      const newIndex = orderedIds.findIndex((id) => id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(orderedIds, oldIndex, newIndex);
      setOrderedIds(next);
      void reorderRoutines(next).then(() => data.reload());
    },
    [orderedIds, data],
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
                logs={data.logs}
                today={today}
                onClick={() => navigate(`/rotina/${routine.id}`)}
                onEdit={() => setEditing({ mode: 'edit', routine })}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <GameButton
        variant="secondary"
        className="flex items-center justify-center gap-2"
        onClick={() => setEditing({ mode: 'create' })}
      >
        <Plus size={16} /> Nova rotina
      </GameButton>

      <RoutineEditorSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        activities={data.activities}
        routine={editing?.mode === 'edit' ? editing.routine : null}
        onSubmit={async (payload: RoutineEditorPayload) => {
          if (editing?.mode === 'edit') {
            await data.updateRoutine(editing.routine.id, { ...payload });
          } else {
            await data.createRoutine({ ...payload });
          }
          await data.reload();
        }}
        onArchive={
          editing?.mode === 'edit'
            ? async () => {
                if (editing.mode !== 'edit') return;
                await data.archiveRoutine(editing.routine.id);
                await data.reload();
              }
            : undefined
        }
      />
    </div>
  );
}
