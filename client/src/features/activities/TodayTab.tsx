import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { groupOccurrences, plannedOccurrencesForDay } from '@shared/activities';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { ActivityQuickCard } from './ActivityQuickCard';
import { ActivityDetailsSheet } from './ActivityDetailsSheet';
import { ActivityCreatorSheet } from './ActivityCreatorSheet';
import { QuickNote } from './QuickNote';
import type { useActivitiesData } from './useActivitiesData';
import type { ActivityOccurrence } from '@shared/activities';

export function TodayTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const today = getTodaySaoPaulo();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [details, setDetails] = useState<ActivityOccurrence | null>(null);

  const occurrences = useMemo(
    () =>
      plannedOccurrencesForDay(
        data.activities,
        today,
        data.logs.filter((log) => log.day_key === today),
      ),
    [data.activities, data.logs, today],
  );
  const groups = groupOccurrences(occurrences);
  const doneCount = groups.done.length;
  const total = occurrences.length;
  const activityById = useMemo(
    () => new Map(data.activities.map((activity) => [activity.id, activity])),
    [data.activities],
  );

  const renderList = (title: string, items: ActivityOccurrence[]) =>
    items.length === 0 ? null : (
      <section className="flex flex-col gap-2">
        <h3 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
          {title}
        </h3>
        {items.map((item) => (
          <ActivityQuickCard
            key={item.occurrence_key + item.activity_id}
            occurrence={item}
            busy={data.busyId === item.activity_id}
            onComplete={() => {
              const activity = activityById.get(item.activity_id);
              if (activity) void data.complete(activity);
            }}
            onDetails={() => setDetails(item)}
          />
        ))}
      </section>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-bold text-stone-600">
        {total === 0
          ? 'Comece com um modelo — nada é imposto.'
          : `${doneCount} de ${total} registradas hoje.`}
      </p>
      {renderList('Agora', groups.now)}
      {renderList('Quando quiser', groups.anytime)}
      {renderList('Mais tarde', groups.later)}
      {renderList('Concluídas', groups.done)}

      <GameButton
        variant="secondary"
        className="flex items-center justify-center gap-2"
        onClick={() => setCreatorOpen(true)}
      >
        <Plus size={16} /> Nova atividade
      </GameButton>
      <QuickNote />

      <ActivityCreatorSheet
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreate={async (body) => {
          await data.createActivity(body);
          await data.reload();
        }}
      />
      <ActivityDetailsSheet
        open={Boolean(details)}
        occurrence={details}
        activity={details ? (activityById.get(details.activity_id) ?? null) : null}
        onClose={() => setDetails(null)}
        onConfirm={(payload) => {
          const activity = details ? activityById.get(details.activity_id) : null;
          if (!activity) return;
          void data.complete(activity, {
            kind: payload.kind,
            note: payload.note,
            metrics: payload.value != null ? { valor: payload.value } : undefined,
          });
          setDetails(null);
        }}
      />
    </div>
  );
}
