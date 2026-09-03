import { getTodaySaoPaulo } from '../utils/timezone.js';
import { activityOccursOnDay } from './schedule.js';
import type {
  ActivityLogKind,
  ActivityOccurrence,
  ActivityPeriod,
  ActivityRecord,
} from './types.js';

export function occurrenceKeyFor(dayKey: string, time: string | null): string {
  return time ? `${dayKey}@${time}` : dayKey;
}

export function plannedOccurrencesForDay(
  activities: ActivityRecord[],
  dayKey: string,
  logs: Array<{
    id: string;
    activity_id: string | null;
    occurrence_key: string | null;
    kind: ActivityLogKind;
  }> = [],
): ActivityOccurrence[] {
  const doneByActivity = new Map<string, { id: string; kind: ActivityLogKind }>();
  for (const log of logs) {
    if (!log.activity_id || doneByActivity.has(log.activity_id)) continue;
    doneByActivity.set(log.activity_id, { id: log.id, kind: log.kind });
  }

  const occurrences: ActivityOccurrence[] = [];
  for (const activity of activities) {
    if (activity.archived_at) continue;
    if (!activityOccursOnDay(activity.schedule, dayKey)) continue;

    const times = activity.schedule.times?.length ? activity.schedule.times : [null];
    for (const time of times) {
      const done = doneByActivity.get(activity.id);
      occurrences.push({
        activity_id: activity.id,
        name: activity.name,
        icon: activity.icon,
        color: activity.color,
        category: activity.category,
        time,
        period: (activity.schedule.period ?? null) as ActivityPeriod | null,
        occurrence_key: occurrenceKeyFor(dayKey, time),
        status: done ? 'done' : 'pending',
        log_id: done?.id,
        kind: done?.kind,
      });
    }
  }
  return occurrences;
}

export function groupOccurrences(
  occurrences: ActivityOccurrence[],
  now = new Date(),
): {
  now: ActivityOccurrence[];
  later: ActivityOccurrence[];
  anytime: ActivityOccurrence[];
  done: ActivityOccurrence[];
} {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const result = {
    now: [] as ActivityOccurrence[],
    later: [] as ActivityOccurrence[],
    anytime: [] as ActivityOccurrence[],
    done: [] as ActivityOccurrence[],
  };

  for (const occurrence of occurrences) {
    if (occurrence.status === 'done') {
      result.done.push(occurrence);
      continue;
    }
    if (!occurrence.time) {
      result.anytime.push(occurrence);
      continue;
    }
    const [hh, mm] = occurrence.time.split(':').map(Number);
    const minutes = hh * 60 + mm;
    if (minutes <= nowMinutes + 30) result.now.push(occurrence);
    else result.later.push(occurrence);
  }
  return result;
}

export function todayOccurrenceKey(time: string | null, now = new Date()): string {
  return occurrenceKeyFor(getTodaySaoPaulo(now), time);
}
