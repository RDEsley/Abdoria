import { getSaoPauloWeekday, getTodaySaoPaulo } from '../utils/timezone.js';
import {
  DEFAULT_ACTIVITY_REMINDER,
  DEFAULT_ACTIVITY_SCHEDULE,
  type ActivityReminderConfig,
  type ActivitySchedule,
} from './types.js';

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeActivitySchedule(raw: unknown): ActivitySchedule {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_ACTIVITY_SCHEDULE };
  }
  const value = raw as Record<string, unknown>;
  const kind =
    value.kind === 'daily' ||
    value.kind === 'weekdays' ||
    value.kind === 'once' ||
    value.kind === 'unscheduled'
      ? value.kind
      : 'unscheduled';
  const weekdays = Array.isArray(value.weekdays)
    ? [...new Set(value.weekdays.map(Number).filter((day) => day >= 0 && day <= 6))].sort(
        (a, b) => a - b,
      )
    : [];
  const times = Array.isArray(value.times) ? [...new Set(value.times.filter(isTime))].sort() : [];
  const period =
    value.period === 'manha' || value.period === 'tarde' || value.period === 'noite'
      ? value.period
      : null;
  const onceAt = typeof value.once_at === 'string' ? value.once_at : null;
  return { kind, weekdays, times, period, once_at: onceAt };
}

export function normalizeActivityReminder(raw: unknown): ActivityReminderConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_ACTIVITY_REMINDER };
  }
  const value = raw as Record<string, unknown>;
  const offset = Number(value.offset_min);
  return {
    enabled: value.enabled === true,
    offset_min: Number.isFinite(offset) ? Math.max(0, Math.min(120, Math.round(offset))) : 0,
    sound: typeof value.sound === 'string' ? value.sound : undefined,
    follow_up: value.follow_up === true,
  };
}

export function activityOccursOnDay(
  schedule: ActivitySchedule,
  dayKey: string,
  weekday = weekdayFromDayKey(dayKey),
): boolean {
  if (schedule.kind === 'unscheduled' || schedule.kind === 'daily') return true;
  if (schedule.kind === 'weekdays') {
    return (schedule.weekdays ?? []).includes(weekday);
  }
  if (schedule.kind === 'once') {
    const once = schedule.once_at;
    if (!once) return false;
    return once.slice(0, 10) === dayKey;
  }
  return false;
}

export function weekdayFromDayKey(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return getSaoPauloWeekday(new Date(Date.UTC(y, m - 1, d, 15, 0, 0)));
}

export function periodFromHour(hour: number): 'manha' | 'tarde' | 'noite' {
  if (hour < 12) return 'manha';
  if (hour < 18) return 'tarde';
  return 'noite';
}

export function isTodaySchedule(schedule: ActivitySchedule, now = new Date()): boolean {
  return activityOccursOnDay(schedule, getTodaySaoPaulo(now), getSaoPauloWeekday(now));
}
