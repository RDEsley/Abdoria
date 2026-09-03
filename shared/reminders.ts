import { type PersonalNotificationIcon } from './notification-catalog.js';
import type { ActivityRecord, ActivitySchedule, RoutineRecord } from './activities/types.js';
import { normalizeActivitySchedule } from './activities/schedule.js';

export const PERSONAL_NOTIFICATION_VERSION = 2 as const;
export const PERSONAL_NOTIFICATION_MAX_REQUESTS = 64;

export type { PersonalNotificationIcon } from './notification-catalog.js';
export type PersonalNotificationColor =
  'neutral' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'amber' | 'coral' | 'rose';

export type PersonalNotificationSchedule =
  { kind: 'once'; at: string } | { kind: 'recurring'; times: string[]; weekdays: number[] };

export interface PersonalizedReminder {
  version: typeof PERSONAL_NOTIFICATION_VERSION;
  id: string;
  title: string;
  message: string;
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
  schedule: PersonalNotificationSchedule;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LegacyPersonalizedReminder {
  id?: unknown;
  title?: unknown;
  message?: unknown;
  time?: unknown;
  weekdays?: unknown;
  skin?: unknown;
  enabled?: unknown;
  createdAt?: unknown;
}

export interface NativeNotificationScheduleDescriptor {
  occurrenceKey: string;
  at?: string;
  on?: { weekday?: number; hour: number; minute: number };
}

export const PERSONAL_NOTIFICATION_ICONS: ReadonlyArray<{
  id: PersonalNotificationIcon;
  label: string;
}> = [
  { id: 'neutral', label: 'Geral' },
  { id: 'water', label: 'Água' },
  { id: 'leaf', label: 'Folha' },
  { id: 'workout', label: 'Treino' },
  { id: 'study', label: 'Estudo' },
  { id: 'health', label: 'Saúde' },
  { id: 'alarm', label: 'Alarme' },
  { id: 'heart', label: 'Coração' },
  { id: 'star', label: 'Estrela' },
] as const;

export const PERSONAL_NOTIFICATION_COLORS: ReadonlyArray<{
  id: PersonalNotificationColor;
  label: string;
  hex: string;
}> = [
  { id: 'neutral', label: 'Neutro', hex: '#64748b' },
  { id: 'emerald', label: 'Verde', hex: '#059669' },
  { id: 'sky', label: 'Azul', hex: '#0284c7' },
  { id: 'indigo', label: 'Índigo', hex: '#4f46e5' },
  { id: 'violet', label: 'Violeta', hex: '#7c3aed' },
  { id: 'amber', label: 'Âmbar', hex: '#d97706' },
  { id: 'coral', label: 'Coral', hex: '#e85d4a' },
  { id: 'rose', label: 'Rosa', hex: '#e11d48' },
] as const;

const ICONS = new Set(PERSONAL_NOTIFICATION_ICONS.map(({ id }) => id));
const COLORS = new Set(PERSONAL_NOTIFICATION_COLORS.map(({ id }) => id));
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validIso(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(new Date(value).getTime())) return null;
  return value;
}

export function normalizeReminderWeekdays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  return [
    ...new Set(days.filter((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)),
  ]
    .map(Number)
    .sort((a, b) => a - b);
}

export function normalizeReminderTimes(times: unknown): string[] {
  if (!Array.isArray(times)) return [];
  return [...new Set(times.filter(isTime))].sort();
}

function migrateLegacyReminder(value: LegacyPersonalizedReminder): PersonalizedReminder | null {
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 60) : '';
  const time = isTime(value.time) ? value.time : null;
  const weekdays = normalizeReminderWeekdays(value.weekdays);
  if (!id || !title || !time || weekdays.length === 0) return null;
  const createdAt = validIso(value.createdAt) ?? new Date(0).toISOString();
  const legacySkin = typeof value.skin === 'string' ? value.skin : '';
  const colorBySkin: Record<string, PersonalNotificationColor> = {
    calm: 'sky',
    energy: 'amber',
    focus: 'violet',
    nature: 'emerald',
    minimal: 'neutral',
  };
  return {
    version: PERSONAL_NOTIFICATION_VERSION,
    id,
    title,
    message: typeof value.message === 'string' ? value.message.trim().slice(0, 160) : '',
    icon: 'neutral',
    color: colorBySkin[legacySkin] ?? 'neutral',
    schedule: { kind: 'recurring', times: [time], weekdays },
    enabled: value.enabled !== false,
    createdAt,
    updatedAt: createdAt,
  };
}

export function normalizePersonalizedReminder(raw: unknown): PersonalizedReminder | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== PERSONAL_NOTIFICATION_VERSION) {
    return migrateLegacyReminder(raw as LegacyPersonalizedReminder);
  }

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 60) : '';
  if (!id || !title || !isRecord(raw.schedule)) return null;

  let schedule: PersonalNotificationSchedule | null = null;
  if (raw.schedule.kind === 'once') {
    const at = validIso(raw.schedule.at);
    if (at) schedule = { kind: 'once', at };
  } else if (raw.schedule.kind === 'recurring') {
    const times = normalizeReminderTimes(raw.schedule.times);
    const weekdays = normalizeReminderWeekdays(raw.schedule.weekdays);
    if (times.length > 0 && weekdays.length > 0) {
      schedule = { kind: 'recurring', times, weekdays };
    }
  }
  if (!schedule) return null;

  const createdAt = validIso(raw.createdAt) ?? new Date(0).toISOString();
  return {
    version: PERSONAL_NOTIFICATION_VERSION,
    id,
    title,
    message: typeof raw.message === 'string' ? raw.message.trim().slice(0, 160) : '',
    icon: ICONS.has(raw.icon as PersonalNotificationIcon)
      ? (raw.icon as PersonalNotificationIcon)
      : 'neutral',
    color: COLORS.has(raw.color as PersonalNotificationColor)
      ? (raw.color as PersonalNotificationColor)
      : 'neutral',
    schedule,
    enabled: raw.enabled !== false,
    createdAt,
    updatedAt: validIso(raw.updatedAt) ?? createdAt,
  };
}

export function normalizePersonalizedReminders(raw: unknown): PersonalizedReminder[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const result: PersonalizedReminder[] = [];
  for (const entry of raw) {
    const reminder = normalizePersonalizedReminder(entry);
    if (!reminder || ids.has(reminder.id)) continue;
    ids.add(reminder.id);
    result.push(reminder);
  }
  return result;
}

/**
 * Converte o modelo em regras recorrentes nativas. Dias específicos geram
 * uma regra semanal por combinação; "todos os dias" usa uma única regra
 * diária por horário. Não existe janela artificial de datas.
 */
export function buildNativeNotificationSchedules(
  reminder: PersonalizedReminder,
): NativeNotificationScheduleDescriptor[] {
  if (!reminder.enabled) return [];
  if (reminder.schedule.kind === 'once') {
    return [{ occurrenceKey: 'once', at: reminder.schedule.at }];
  }

  const { times, weekdays } = reminder.schedule;
  const everyDay =
    weekdays.length === ALL_WEEKDAYS.length &&
    ALL_WEEKDAYS.every((weekday) => weekdays.includes(weekday));
  return times.flatMap((time) => {
    const [hour, minute] = time.split(':').map(Number);
    if (everyDay) return [{ occurrenceKey: `daily-${time}`, on: { hour, minute } }];
    return weekdays.map((weekday) => ({
      occurrenceKey: `weekly-${weekday}-${time}`,
      // Capacitor usa 1=domingo ... 7=sábado; o modelo web usa 0...6.
      on: { weekday: weekday + 1, hour, minute },
    }));
  });
}

export interface ReminderClockParts {
  dateKey: string;
  weekday: number;
  hour: number;
  minute: number;
}

/** Partes do relógio civil em um fuso IANA (para checagem server-side de lembretes). */
export function getReminderClockParts(date: Date, timeZone: string): ReminderClockParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  let hour = Number(value('hour'));
  if (hour === 24) hour = 0;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    weekday: weekdayMap[value('weekday')] ?? 0,
    hour,
    minute: Number(value('minute')),
  };
}

export function formatReminderMinuteKey(parts: ReminderClockParts): string {
  return `${parts.dateKey}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function isReminderDueInTimeZone(
  reminder: PersonalizedReminder,
  date: Date,
  timeZone: string,
): boolean {
  if (!reminder.enabled) return false;
  const now = getReminderClockParts(date, timeZone);
  const time = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;

  if (reminder.schedule.kind === 'once') {
    const at = getReminderClockParts(new Date(reminder.schedule.at), timeZone);
    return at.dateKey === now.dateKey && at.hour === now.hour && at.minute === now.minute;
  }

  return reminder.schedule.weekdays.includes(now.weekday) && reminder.schedule.times.includes(time);
}

export function buildReminderOccurrenceKey(
  reminder: PersonalizedReminder,
  minuteKey: string,
): string {
  if (reminder.schedule.kind === 'once') return `${reminder.id}:once:${minuteKey}`;
  const time = minuteKey.slice(11);
  return `${reminder.id}:recurring:${time}:${minuteKey}`;
}

export interface ReminderOccurrence {
  reminder: PersonalizedReminder;
  occurrenceKey: string;
  minuteKey: string;
}

export const DEFAULT_REMINDER_PUSH_LOOKBACK_MINUTES = 15;

/**
 * Lista ocorrências agendadas dentro de uma janela retroativa a partir de `now`.
 * Permite recuperar lembretes quando o worker atrasa alguns minutos.
 */
export function listReminderOccurrencesInLookback(
  reminders: PersonalizedReminder[],
  now: Date,
  timeZone: string,
  lookbackMinutes: number,
): ReminderOccurrence[] {
  const lookback = Math.max(0, Math.floor(lookbackMinutes));
  const byKey = new Map<string, ReminderOccurrence>();

  for (let delay = 0; delay <= lookback; delay += 1) {
    const instant = new Date(now.getTime() - delay * 60_000);
    for (const reminder of reminders) {
      if (!reminder.enabled) continue;
      if (!isReminderDueInTimeZone(reminder, instant, timeZone)) continue;
      const minuteKey = formatReminderMinuteKey(getReminderClockParts(instant, timeZone));
      const occurrenceKey = buildReminderOccurrenceKey(reminder, minuteKey);
      if (!byKey.has(occurrenceKey)) {
        byKey.set(occurrenceKey, { reminder, occurrenceKey, minuteKey });
      }
    }
  }

  return [...byKey.values()];
}

/** Checagem no relógio local do dispositivo/navegador (Capacitor e fallback web). */
export function isReminderDue(reminder: PersonalizedReminder, date: Date): boolean {
  return isReminderDueInTimeZone(
    reminder,
    date,
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
}

function isTimeValue(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function shiftTime(time: string, deltaMin: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = (((hours * 60 + minutes + deltaMin) % 1440) + 1440) % 1440;
  const nextHours = Math.floor(total / 60);
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function mapActivityIcon(icon: string): PersonalNotificationIcon {
  const map: Record<string, PersonalNotificationIcon> = {
    droplet: 'water',
    star: 'star',
    heart: 'heart',
    dumbbell: 'workout',
    target: 'study',
    flame: 'alarm',
    sun: 'leaf',
    moon: 'health',
    sparkles: 'star',
    calendar: 'alarm',
    zap: 'workout',
  };
  return map[icon] ?? 'leaf';
}

function mapActivityColor(color: string): PersonalNotificationColor {
  const allowed = new Set(PERSONAL_NOTIFICATION_COLORS.map((entry) => entry.id));
  return allowed.has(color as PersonalNotificationColor)
    ? (color as PersonalNotificationColor)
    : 'emerald';
}

function reminderScheduleFromActivity(
  schedule: ActivitySchedule,
): PersonalNotificationSchedule | null {
  const times = (schedule.times ?? []).filter(isTimeValue);
  if (times.length === 0 && schedule.kind !== 'once') return null;
  if (schedule.kind === 'once') {
    if (!schedule.once_at) return null;
    return { kind: 'once', at: schedule.once_at };
  }
  const weekdays =
    schedule.kind === 'weekdays' && (schedule.weekdays ?? []).length > 0
      ? [...schedule.weekdays!]
      : [0, 1, 2, 3, 4, 5, 6];
  return { kind: 'recurring', times, weekdays };
}

export function isDerivedActivityReminderId(id: string): boolean {
  return id.startsWith('activity:') || id.startsWith('routine:');
}

export function derivedReminderSourceId(id: string): string | null {
  const parts = id.split(':');
  if (parts.length < 2) return null;
  if (parts[0] !== 'activity' && parts[0] !== 'routine') return null;
  return parts[1] ?? null;
}

export function isFollowUpReminderId(id: string): boolean {
  return id.endsWith(':followup');
}

/**
 * Lembretes derivados de activities/routines. Não materializar em
 * `preferencias.lembretes_personalizados` — dispatcher e scheduler nativo
 * unem `personal ∪ derivados` na hora da entrega.
 */
export function deriveActivityReminders(
  activities: Array<
    Pick<ActivityRecord, 'id' | 'name' | 'icon' | 'color' | 'archived_at' | 'schedule' | 'reminder'>
  >,
  routines: Array<
    Pick<RoutineRecord, 'id' | 'name' | 'icon' | 'color' | 'archived_at' | 'schedule' | 'reminder'>
  > = [],
  nowIso = new Date().toISOString(),
): PersonalizedReminder[] {
  const derived: PersonalizedReminder[] = [];
  const sources = [
    ...activities.map((item) => ({ kind: 'activity' as const, item })),
    ...routines.map((item) => ({ kind: 'routine' as const, item })),
  ];

  for (const source of sources) {
    const entity = source.item;
    if (entity.archived_at) continue;
    if (!entity.reminder?.enabled) continue;
    const reminder = entity.reminder;
    const schedule = normalizeActivitySchedule(entity.schedule);
    if (schedule.kind === 'unscheduled') continue;
    const personalSchedule = reminderScheduleFromActivity(schedule);
    if (!personalSchedule) continue;

    const times =
      personalSchedule.kind === 'recurring'
        ? personalSchedule.times.map((time) => shiftTime(time, -(reminder.offset_min || 0)))
        : [];
    const adjusted: PersonalNotificationSchedule =
      personalSchedule.kind === 'once'
        ? personalSchedule
        : { kind: 'recurring', times, weekdays: personalSchedule.weekdays };

    const timeKey =
      personalSchedule.kind === 'once'
        ? personalSchedule.at.slice(0, 16)
        : (personalSchedule.times[0] ?? 'none');
    const baseId = `${source.kind}:${entity.id}:${timeKey}`;
    derived.push({
      version: PERSONAL_NOTIFICATION_VERSION,
      id: baseId,
      title: entity.name,
      message:
        source.kind === 'routine' ? 'Hora da sua rotina.' : 'Um passo da sua rotina te espera.',
      icon: mapActivityIcon(entity.icon),
      color: mapActivityColor(entity.color),
      schedule: adjusted,
      enabled: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (reminder.follow_up && personalSchedule.kind === 'recurring') {
      derived.push({
        version: PERSONAL_NOTIFICATION_VERSION,
        id: `${baseId}:followup`,
        title: entity.name,
        message: 'Ainda dá tempo de registrar hoje.',
        icon: mapActivityIcon(entity.icon),
        color: mapActivityColor(entity.color),
        schedule: {
          kind: 'recurring',
          times: personalSchedule.times.map((time) => shiftTime(time, 30)),
          weekdays: personalSchedule.weekdays,
        },
        enabled: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  return derived;
}

export function describePersonalNotificationSchedule(reminder: PersonalizedReminder): string {
  if (reminder.schedule.kind === 'once') {
    return new Date(reminder.schedule.at).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const times = reminder.schedule.times.join(', ');
  if (reminder.schedule.weekdays.length === 7) return `Todos os dias · ${times}`;
  return `${reminder.schedule.weekdays.length} dias/semana · ${times}`;
}
