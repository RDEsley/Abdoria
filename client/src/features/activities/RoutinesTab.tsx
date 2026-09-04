import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Modal } from '@/components/ui/Modal';
import { listArchivedRoutines, reorderRoutines, restoreRoutine } from '@/lib/api/activities';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/lib/game-toast';
import { successHaptic } from '@/lib/platform/native-runtime';
import { activityOccursOnDay, resolveRoutineHealth, routineItemsDoneToday } from '@shared/activities';
import { getMinutesOfDaySaoPaulo, getTodaySaoPaulo } from '@shared/utils/timezone';
import type { ActivityLogRecord, ActivityRecord, RoutineRecord } from '@shared/activities';
import { RoutineEditorSheet, type RoutineEditorPayload } from './RoutineEditorSheet';
import type { useActivitiesData } from './useActivitiesData';

const CREATE_SUCCESS_PHRASES = [
  'Rotina plantada. Agora é só seguir o ritmo.',
  'Nova rotina pronta. Um passo de cada vez.',
  'Montada! Sua evolução ganhou um caminho.',
  'Rotina criada. Plantando consistência.',
  'Pronto. Essa rotina já faz parte do seu dia.',
  'Criada com cuidado. Agora é cultivar o hábito.',
  'Mais uma rotina no jardim. Vamos crescer.',
  'Feito. Sua rotina está no Evolyn.',
] as const;

const PHRASE_STORAGE_KEY = 'evolyn:routine-create-phrase';

function pickCreateSuccessPhrase(): string {
  let last = '';
  try {
    last = sessionStorage.getItem(PHRASE_STORAGE_KEY) ?? '';
  } catch {
    last = '';
  }
  const pool = CREATE_SUCCESS_PHRASES.filter((phrase) => phrase !== last);
  const choices = pool.length > 0 ? pool : [...CREATE_SUCCESS_PHRASES];
  const next = choices[Math.floor(Math.random() * choices.length)] ?? CREATE_SUCCESS_PHRASES[0];
  try {
    sessionStorage.setItem(PHRASE_STORAGE_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

function formatArchivedApprox(iso: string | null): string {
  if (!iso) return 'Arquivada recentemente';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Arquivada recentemente';
  return `Arquivada em ${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

function SortableRoutineCard({
  routine,
  logs,
  today,
  activities,
  onClick,
  onEdit,
}: {
  routine: RoutineRecord;
  logs: ActivityLogRecord[];
  today: string;
  activities: ActivityRecord[];
  onClick: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  });
  const liveIds = useMemo(() => new Set(activities.map((activity) => activity.id)), [activities]);
  const health = useMemo(() => resolveRoutineHealth(routine, liveIds), [routine, liveIds]);
  const aliveItems = useMemo(
    () => (routine.items ?? []).filter((item) => liveIds.has(item.activity_id)),
    [routine.items, liveIds],
  );
  const total = health.availableItems;
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
    return routineItemsDoneToday({ id: routine.id, items: aliveItems }, todayLogs);
  }, [routine.id, aliveItems, logs, today]);
  const secondary = isScheduled && !scheduledToday;
  const attention = health.state !== 'healthy';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-no-nav-swipe
      className={`routine-card${secondary ? ' routine-card--secondary' : ''}${isDragging ? ' routine-card--dragging' : ''}`}
    >
      <button
        type="button"
        className="routine-card__handle"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden />
      </button>
      <button type="button" className="routine-card__body" onClick={onClick}>
        <span className="routine-card__title-row">
          <strong className="routine-card__name">{routine.name}</strong>
          {attention ? (
            <span className="routine-badge routine-badge--attention">Atenção</span>
          ) : scheduledToday ? (
            <span className={`routine-badge${isNow ? ' routine-badge--now' : ''}`}>
              {isNow ? 'Agora' : 'Hoje'}
            </span>
          ) : null}
        </span>
        <small className="routine-card__meta">
          {attention
            ? health.state === 'empty'
              ? 'Precisa de atividades'
              : `${health.unavailableItems} indisponível${health.unavailableItems === 1 ? '' : 'eis'}`
            : total > 0
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
        <Pencil size={15} aria-hidden />
      </button>
    </div>
  );
}

export function RoutinesTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [editing, setEditing] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; routine: RoutineRecord }
    | { mode: 'repair-restore'; routine: RoutineRecord }
    | null
  >(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archived, setArchived] = useState<RoutineRecord[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const today = getTodaySaoPaulo();
  const liveIds = useMemo(
    () => new Set(data.activities.map((activity) => activity.id)),
    [data.activities],
  );

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

  const openArchived = useCallback(() => {
    setArchivedOpen(true);
    setArchivedLoading(true);
    void listArchivedRoutines()
      .then((list) => setArchived(list))
      .catch((error) => {
        showGameToast(getErrorMessage(error, 'Não foi possível carregar rotinas arquivadas.'), {
          variant: 'error',
        });
        setArchivedOpen(false);
      })
      .finally(() => setArchivedLoading(false));
  }, []);

  const handleRestore = useCallback(
    async (routine: RoutineRecord) => {
      const health = resolveRoutineHealth(routine, liveIds);
      if (health.state !== 'healthy') {
        setArchivedOpen(false);
        setEditing({ mode: 'repair-restore', routine });
        return;
      }
      setRestoringId(routine.id);
      try {
        await restoreRoutine(routine.id);
        await data.reload();
        setArchived((current) => current.filter((item) => item.id !== routine.id));
        showGameToast('Rotina restaurada.', { variant: 'success' });
        void successHaptic();
      } catch (error) {
        showGameToast(getErrorMessage(error, 'Não foi possível restaurar.'), { variant: 'error' });
      } finally {
        setRestoringId(null);
      }
    },
    [data, liveIds],
  );

  useEffect(() => {
    const editId = (location.state as { editRoutineId?: string } | null)?.editRoutineId;
    if (!editId) return;
    const routine = data.routines.find((item) => item.id === editId);
    if (routine) setEditing({ mode: 'edit', routine });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, data.routines, navigate]);

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
                activities={data.activities}
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

      <button type="button" className="routine-archived-trigger" onClick={openArchived}>
        Rotinas arquivadas
      </button>

      <RoutineEditorSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        activities={data.activities}
        routine={
          editing?.mode === 'edit' || editing?.mode === 'repair-restore' ? editing.routine : null
        }
        onSubmit={async (payload: RoutineEditorPayload) => {
          if (editing?.mode === 'edit') {
            await data.updateRoutine(editing.routine.id, { ...payload });
          } else if (editing?.mode === 'repair-restore') {
            await data.updateRoutine(editing.routine.id, { ...payload });
            await restoreRoutine(editing.routine.id);
            await data.reload();
            showGameToast('Rotina restaurada.', { variant: 'success' });
            void successHaptic();
          } else {
            await data.createRoutine({ ...payload });
            showGameToast(pickCreateSuccessPhrase(), { variant: 'success' });
            void successHaptic();
          }
          await data.reload();
        }}
        onArchive={
          editing?.mode === 'edit'
            ? async () => {
                if (editing.mode !== 'edit') return;
                const archivedRoutine = editing.routine;
                await data.archiveRoutine(archivedRoutine.id);
                await data.reload();
                showGameToast('Rotina arquivada', {
                  variant: 'info',
                  duration: 5000,
                  actionLabel: 'Desfazer',
                  onAction: () => {
                    void restoreRoutine(archivedRoutine.id)
                      .then(() => data.reload())
                      .catch((error) => {
                        showGameToast(getErrorMessage(error, 'Não foi possível restaurar.'), {
                          variant: 'error',
                        });
                      });
                  },
                });
              }
            : undefined
        }
      />

      <Modal
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        labelledBy="archived-routines-title"
      >
        <div className="p-4">
          <h2 id="archived-routines-title" className="game-section-title">
            Rotinas arquivadas
          </h2>
          {archivedLoading ? (
            <p className="mt-3 text-sm font-semibold text-stone-500">Carregando…</p>
          ) : archived.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-stone-500">
              Nenhuma rotina arquivada no momento.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
              {archived.map((routine) => {
                const health = resolveRoutineHealth(routine, liveIds);
                const needsReview = health.state !== 'healthy';
                return (
                  <li key={routine.id} className="routine-archived-row">
                    <div className="min-w-0 flex-1">
                      <strong>{routine.name}</strong>
                      <small>
                        {needsReview
                          ? 'Precisa de atenção'
                          : formatArchivedApprox(routine.archived_at)}
                      </small>
                    </div>
                    <GameButton
                      variant="secondary"
                      size="sm"
                      disabled={restoringId === routine.id}
                      onClick={() => void handleRestore(routine)}
                    >
                      {restoringId === routine.id
                        ? 'Restaurando…'
                        : needsReview
                          ? 'Revisar e restaurar'
                          : 'Restaurar'}
                    </GameButton>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4">
            <GameButton variant="secondary" className="w-full" onClick={() => setArchivedOpen(false)}>
              Fechar
            </GameButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
