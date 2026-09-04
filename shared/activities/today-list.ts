import { activityOccursOnDay } from './schedule.js';
import type {
  ActivityCategory,
  ActivityLogKind,
  ActivityOccurrence,
  ActivityPeriod,
  ActivityRecord,
} from './types.js';

export type ActivityListFilter = 'todas' | 'hoje' | 'mente' | 'corpo' | 'vida' | 'outros';

export function matchesActivityCategoryFilter(
  category: ActivityCategory | string | undefined,
  filter: ActivityListFilter,
): boolean {
  if (filter === 'todas' || filter === 'hoje') return true;
  if (filter === 'outros') return category === 'outro' || !category;
  return category === filter;
}

function doneMapFromLogs(
  logs: Array<{ id: string; activity_id: string | null; kind: ActivityLogKind }>,
) {
  const doneByActivity = new Map<string, { id: string; kind: ActivityLogKind }>();
  for (const log of logs) {
    if (!log.activity_id || doneByActivity.has(log.activity_id)) continue;
    doneByActivity.set(log.activity_id, { id: log.id, kind: log.kind });
  }
  return doneByActivity;
}

/** Occurrence sintética para Activities ativas que não ocorrem no dayKey. */
export function backlogOccurrenceForActivity(
  activity: ActivityRecord,
  dayKey: string,
  logs: Array<{ id: string; activity_id: string | null; kind: ActivityLogKind }> = [],
): ActivityOccurrence | null {
  if (activity.archived_at) return null;
  if (activityOccursOnDay(activity.schedule, dayKey)) return null;
  const done = doneMapFromLogs(logs).get(activity.id);
  return {
    activity_id: activity.id,
    name: activity.name,
    icon: activity.icon,
    color: activity.color,
    category: activity.category,
    time: null,
    period: (activity.schedule.period ?? null) as ActivityPeriod | null,
    occurrence_key: `backlog:${activity.id}:${dayKey}`,
    status: done ? 'done' : 'pending',
    log_id: done?.id,
    kind: done?.kind,
    not_planned_today: true,
  };
}

export function filterTodayTabOccurrences(input: {
  plannedToday: ActivityOccurrence[];
  activities: ActivityRecord[];
  dayKey: string;
  logs: Array<{ id: string; activity_id: string | null; kind: ActivityLogKind }>;
  filter: ActivityListFilter;
  query: string;
}): { planned: ActivityOccurrence[]; backlog: ActivityOccurrence[] } {
  const needle = input.query.trim().toLowerCase();
  const matchesQuery = (name: string) => !needle || name.toLowerCase().includes(needle);

  const planned = input.plannedToday.filter((item) => {
    if (!matchesQuery(item.name)) return false;
    if (input.filter === 'hoje') return true;
    return matchesActivityCategoryFilter(item.category, input.filter);
  });

  if (input.filter === 'hoje') {
    return { planned, backlog: [] };
  }

  const plannedIds = new Set(input.plannedToday.map((item) => item.activity_id));
  const backlog: ActivityOccurrence[] = [];
  for (const activity of input.activities) {
    if (plannedIds.has(activity.id)) continue;
    const item = backlogOccurrenceForActivity(activity, input.dayKey, input.logs);
    if (!item) continue;
    if (!matchesQuery(item.name)) continue;
    if (!matchesActivityCategoryFilter(item.category, input.filter)) continue;
    backlog.push(item);
  }

  return { planned, backlog };
}

/** Evita colisão de keys quando a mesma activity entra por paths diferentes. */
export function occurrenceListKey(item: ActivityOccurrence): string {
  return `${item.occurrence_key}:${item.activity_id}:${item.not_planned_today ? 'b' : 't'}`;
}
