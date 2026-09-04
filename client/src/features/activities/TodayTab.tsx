import { useMemo, useState } from 'react';
import { Filter, Plus, Search } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import {
  filterTodayTabOccurrences,
  groupOccurrences,
  occurrenceListKey,
  plannedOccurrencesForDay,
  type ActivityListFilter,
  type ActivityOccurrence,
} from '@shared/activities';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { actionHaptic } from '@/lib/platform/native-runtime';
import { ActivityQuickCard } from './ActivityQuickCard';
import { markActivitySwipeHintDone } from '@/lib/activity-swipe-hint';
import { ActivityDetailsSheet } from './ActivityDetailsSheet';
import { ActivityCreatorSheet } from './ActivityCreatorSheet';
import { QuickNote } from './QuickNote';
import type { useActivitiesData } from './useActivitiesData';

const FILTERS: { id: ActivityListFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'mente', label: 'Mente' },
  { id: 'corpo', label: 'Corpo' },
  { id: 'vida', label: 'Vida' },
  { id: 'outros', label: 'Outros' },
];

export function TodayTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const today = getTodaySaoPaulo();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [details, setDetails] = useState<ActivityOccurrence | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ActivityListFilter>('todas');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hintSlotUsed, setHintSlotUsed] = useState(false);

  const todayLogs = useMemo(
    () => data.logs.filter((log) => log.day_key === today),
    [data.logs, today],
  );

  const plannedToday = useMemo(
    () => plannedOccurrencesForDay(data.activities, today, todayLogs),
    [data.activities, today, todayLogs],
  );

  const { planned, backlog } = useMemo(
    () =>
      filterTodayTabOccurrences({
        plannedToday,
        activities: data.activities,
        dayKey: today,
        logs: todayLogs,
        filter,
        query,
      }),
    [plannedToday, data.activities, today, todayLogs, filter, query],
  );

  const groups = groupOccurrences(planned);
  const visibleCount = planned.length + backlog.length;
  const doneCount =
    groups.done.length + backlog.filter((item) => item.status === 'done').length;
  const activityById = useMemo(
    () => new Map(data.activities.map((activity) => [activity.id, activity])),
    [data.activities],
  );

  const firstHintKey = useMemo(() => {
    const pending = [...groups.now, ...groups.anytime, ...groups.later].find(
      (item) => item.status !== 'done',
    );
    return pending ? occurrenceListKey(pending) : null;
  }, [groups.anytime, groups.later, groups.now]);

  const completeOptimistic = (activityId: string) => {
    const activity = activityById.get(activityId);
    if (!activity) return;
    markActivitySwipeHintDone();
    void data.complete(activity, { optimisticUi: true, suppressHaptic: true });
  };

  const archiveWithUndo = (activityId: string) => {
    const activity = activityById.get(activityId);
    if (!activity) return;
    setDetails(null);
    void (async () => {
      try {
        await data.archiveActivity(activityId);
        showGameToast('Atividade removida', {
          variant: 'info',
          duration: 5000,
          actionLabel: 'Desfazer',
          onAction: () => {
            void data.restoreActivity(activityId, activity).catch((error) => {
              showGameToast(getErrorMessage(error, 'Não foi possível restaurar.'), {
                variant: 'error',
              });
            });
          },
        });
      } catch (error) {
        showGameToast(getErrorMessage(error, 'Não foi possível remover.'), { variant: 'error' });
      }
    })();
  };

  const renderList = (title: string, items: ActivityOccurrence[]) =>
    items.length === 0 ? null : (
      <section className="flex flex-col gap-2">
        <h3 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
          {title}
        </h3>
        {items.map((item) => {
          const cardKey = occurrenceListKey(item);
          return (
            <ActivityQuickCard
              key={cardKey}
              occurrence={item}
              busy={data.isBusy(item.activity_id)}
              playHint={!hintSlotUsed && firstHintKey === cardKey}
              onHintConsumed={() => setHintSlotUsed(true)}
              onComplete={() => completeOptimistic(item.activity_id)}
              onArchive={() => archiveWithUndo(item.activity_id)}
              onDetails={() => setDetails(item)}
            />
          );
        })}
      </section>
    );

  return (
    <div className="flex flex-col gap-4">
      <QuickNote />

      <p className="text-sm font-bold text-stone-600">
        {data.activities.length === 0
          ? 'Comece com um modelo — nada é imposto.'
          : filter === 'hoje'
            ? `${groups.done.length} de ${planned.length} hoje`
            : `${doneCount} de ${visibleCount} · ${plannedToday.length} no dia`}
      </p>

      <div className="flex items-center gap-2">
        <label className="activities-search flex-1">
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar atividade"
            aria-label="Buscar atividades por nome"
          />
        </label>
        <button
          type="button"
          className={`activities-filter-toggle${filtersOpen || filter !== 'todas' ? ' is-on' : ''}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <Filter size={15} aria-hidden />
          Filtros
        </button>
      </div>

      {filtersOpen && (
        <div className="activities-filter-chips" role="listbox" aria-label="Filtros de atividades">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={filter === entry.id}
              className={filter === entry.id ? 'is-on' : undefined}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}

      {renderList('Agora', groups.now)}
      {renderList('Quando eu quiser', groups.anytime)}
      {renderList('Mais tarde', groups.later)}
      {renderList('Concluídas', groups.done)}
      {renderList('Outras atividades', backlog)}

      {visibleCount === 0 && data.activities.length > 0 && (
        <p className="text-sm font-bold text-stone-500">Nenhuma atividade com esse filtro.</p>
      )}

      <GameButton
        variant="secondary"
        className="flex items-center justify-center gap-2"
        onClick={() => setCreatorOpen(true)}
      >
        <Plus size={16} /> Nova atividade
      </GameButton>

      <ActivityCreatorSheet
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreate={async (body) => {
          await data.createActivity(body);
        }}
      />
      <ActivityDetailsSheet
        open={Boolean(details)}
        occurrence={details}
        activity={details ? (activityById.get(details.activity_id) ?? null) : null}
        onClose={() => setDetails(null)}
        onSave={async (id, body) => {
          await data.updateActivity(id, body);
          showGameToast('Atividade atualizada', { variant: 'success' });
        }}
        onArchive={(id) => archiveWithUndo(id)}
        onConfirm={(payload) => {
          const activity = details ? activityById.get(details.activity_id) : null;
          if (!activity) return;
          void actionHaptic();
          void data.complete(activity, {
            kind: payload.kind,
            note: payload.note,
            metrics: payload.value != null ? { valor: payload.value } : undefined,
            optimisticUi: true,
            suppressHaptic: true,
          });
          setDetails(null);
        }}
      />
    </div>
  );
}
