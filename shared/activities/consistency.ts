import { addDaysSaoPaulo } from '../utils/timezone.js';

export interface ConsistencyLog {
  activity_id: string | null;
  day_key: string;
}

export interface ActivityConsistency {
  activity_id: string;
  days_done: number;
  days_window: number;
  percent: number;
  consecutive: number;
}

export function consistencyLast30Days(
  activityId: string,
  logs: ConsistencyLog[],
  todayKey: string,
  window = 30,
): ActivityConsistency {
  const start = addDaysSaoPaulo(todayKey, -(window - 1));
  const days = new Set(
    logs
      .filter(
        (log) => log.activity_id === activityId && log.day_key >= start && log.day_key <= todayKey,
      )
      .map((log) => log.day_key),
  );
  let consecutive = 0;
  let cursor = todayKey;
  while (days.has(cursor) && consecutive < window) {
    consecutive += 1;
    cursor = addDaysSaoPaulo(cursor, -1);
  }
  return {
    activity_id: activityId,
    days_done: days.size,
    days_window: window,
    percent: Math.round((days.size / window) * 100),
    consecutive,
  };
}

export function mostConsistentActivity(
  activityIds: string[],
  logs: ConsistencyLog[],
  todayKey: string,
): ActivityConsistency | null {
  let best: ActivityConsistency | null = null;
  for (const id of activityIds) {
    const current = consistencyLast30Days(id, logs, todayKey);
    if (!best || current.days_done > best.days_done) best = current;
  }
  return best;
}
