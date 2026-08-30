export const PERSONAL_NOTIFICATION_VERSION = 2 as const;
export const PERSONAL_NOTIFICATION_MAX_REQUESTS = 64;

export type PersonalNotificationIcon =
  'neutral' | 'water' | 'leaf' | 'workout' | 'study' | 'health' | 'alarm' | 'heart' | 'star';
export type PersonalNotificationColor =
  'neutral' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'amber' | 'coral' | 'rose';
export type PersonalNotificationSound = 'default' | 'soft' | 'nature' | 'motivational' | 'silent';

export type PersonalNotificationSchedule =
  { kind: 'once'; at: string } | { kind: 'recurring'; times: string[]; weekdays: number[] };

export interface PersonalizedReminder {
  version: typeof PERSONAL_NOTIFICATION_VERSION;
  id: string;
  title: string;
  message: string;
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
  sound: PersonalNotificationSound;
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
    sound: 'default',
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
    sound:
      raw.sound === 'soft' ||
      raw.sound === 'nature' ||
      raw.sound === 'motivational' ||
      raw.sound === 'silent'
        ? raw.sound
        : 'default',
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

export function isReminderDue(reminder: PersonalizedReminder, date: Date): boolean {
  if (!reminder.enabled) return false;
  if (reminder.schedule.kind === 'once') {
    const at = new Date(reminder.schedule.at);
    return (
      at.getFullYear() === date.getFullYear() &&
      at.getMonth() === date.getMonth() &&
      at.getDate() === date.getDate() &&
      at.getHours() === date.getHours() &&
      at.getMinutes() === date.getMinutes()
    );
  }
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return (
    reminder.schedule.weekdays.includes(date.getDay()) && reminder.schedule.times.includes(time)
  );
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
